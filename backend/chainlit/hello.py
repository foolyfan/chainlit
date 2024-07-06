# This is a simple example of a chainlit app.

import asyncio
import json
import os
import uuid
from typing import List, Optional, Union

import aiofiles
import httpx
from chainlit.element import Image, Text
from chainlit.extensions.element import DataItem, PreviewInfoGroup
from chainlit.extensions.exceptions import AskTimeout
from chainlit.extensions.input import (
    AccountAndMobilePhoneInput,
    AccountInput,
    AmountInput,
    ClientRule,
    FixedLength,
    MobilePhoneInput,
    ServerRule,
    ValidateResult,
    ValueType,
)
from chainlit.extensions.message import (
    AskUserCheckAgreeement,
    AskUserChoiceMessage,
    GatherCommand,
    JsFunctionCommand,
    PreselectionMessage,
    PSInputItem,
)
from chainlit.extensions.types import (
    ButtonWidget,
    ChoiceItem,
    JsInterfaceEnum,
    MdLink,
    PSMessageItem,
    SubChoiceWidget,
)
from chainlit.logger import logger
from chainlit.types import AskUserResponse
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from chainlit import (
    Action,
    AskActionMessage,
    AskUserMessage,
    Message,
    account_mobilephone_recognition,
    account_recognition,
    action_callback,
    amount_recognition,
    asr_method,
    image_account_recognition,
    mobilephone_recognition,
    on_message,
    predefined_procedure,
    tts_method,
)


async def choiceFirst(
    res: str, choices: List[ChoiceItem], widgets: Optional[List[SubChoiceWidget]]
) -> Union[dict, str]:
    logger.info(f"默认选择第一条")
    return choices[0].data


async def choiceResultConfirm(res: str, actions: List[Action]):
    logger.info(f"默认选择第一一个按钮")
    return actions[0].data


async def confirmTradePreviewInfo(res: AskUserResponse, actions):
    logger.info(f"用户确认结果：{res}")
    if res["type"] == "text":
        logger.info("调用AI选择")
        return actions[1]
    else:
        return actions[0]


class AccountAndMobilePhoneRule(ClientRule):

    def __init__(self):
        self.condition = "onChange"
        self.name = "AccountAndMobilePhoneRule"


async def agree(value: str):
    return True


"""
静态注册
"""


@predefined_procedure
async def predefined_procedure_handler(value: Union[dict, str]):
    logger.info(f"predefined_procedure: {value}")
    await Message(content=f"{value}").send()


@account_recognition
async def account_hook(value: str) -> Union[str, GatherCommand, None]:
    """
    账号语音识别处理

    Parameters:
    value: 用户的语音经asr解析后的文本结果

    Returns:
    Union[str, GatherCommand, None]: 如果不包含具体的指令，返回原始内容或AI解析出用户意图金额（500块钱吧 -> 500），进行格式校验；如果包含具体的指令，返回实例化的指令对象；当返回None时会要求用户再次输入
    """

    if value == "扫一扫":
        return GatherCommand(action="scan", timeout=30)
    return value


@amount_recognition
async def amount_hook(value: str) -> Union[str, GatherCommand, None]:
    """
    金额语音识别处理

    Parameters:
    value: 用户的语音经asr解析后的文本结果

    Returns:
    Union[str, GatherCommand, None]: 如果不包含具体的指令，返回原始内容或AI解析出用户意图金额（500块钱吧 -> 500），进行格式校验；如果包含具体的指令，返回实例化的指令对象；当返回None时会要求用户再次输入
    """

    return "3900"


@mobilephone_recognition
async def mobilephone_hook(value: str) -> Union[str, GatherCommand, None]:

    return "18536402990"


@image_account_recognition
async def image_account_hook(filePath) -> Union[str, None]:
    return "622458"


@account_mobilephone_recognition
async def account_mobilephone_hook(filePath) -> Union[str, None]:
    return "18536403990"


@asr_method
async def asrHook_local(filePath):
    return "语音解析结果"


async def asrHook(filePath):
    async with aiofiles.open(filePath, "rb") as file:
        files = {"file": (os.path.basename(filePath), await file.read(), "audio/voice")}
        try:
            timeout = httpx.Timeout(
                connect=30.0,  # 连接超时
                read=30.0,  # 读取超时
                write=30.0,  # 写入超时
                pool=5.0,  # 连接池获取连接的超时
            )
            async with httpx.AsyncClient(timeout=timeout) as client:
                # 发送POST请求
                response = await client.post(
                    "http://dev.siro-info.com:8000/v1/audio/transcriptions", files=files
                )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Asr server failed to parse",
            )
        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Asr server failed to parse",
            )
        content = json.loads(response.content.decode("utf-8"))["text"]
        logger.info(f"语音解析成功 {response.content}")
        return content


@tts_method
async def ttshook_local(content, params):
    file_path = "c:\\Users\\22571\\workspace\\company\\chainlit-workspace\\111.wav"

    async def file_iterator(file_path):
        try:
            async with aiofiles.open(file_path, "rb") as f:
                # 模拟加载资源慢
                # bufferSize = 1024
                bufferSize = 1024 * 1024
                while True:
                    chunk = await f.read(bufferSize)
                    if not chunk:
                        break
                    yield chunk
        except GeneratorExit:
            logger.info("客户端断开连接")

    return StreamingResponse(
        file_iterator(file_path),
        media_type="audio/wav",
        headers={"X-File-ID": str(uuid.uuid4())},
    )


async def ttsHook(content, params):
    url = "http://dev.siro-info.com:8000/voice"
    logger.info(f"文本解析 {content}")
    params = {
        "text": content,
        "model_id": params["modelId"],
        "speaker_name": params["speakerName"],
        "language": params["language"],
    }
    try:
        timeout = httpx.Timeout(
            connect=30.0,  # 连接超时
            read=30.0,  # 读取超时
            write=30.0,  # 写入超时
            pool=5.0,  # 连接池获取连接的超时
        )
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, params=params)
    except:
        print("文本解析失败")
        return ""

    if response.status_code == 200:
        logger.info("文本解析成功")

        async def iterfile():
            try:
                async for chunk in response.aiter_bytes():
                    yield chunk
            except GeneratorExit:
                logger.info("客户端断开连接")
                raise

        return StreamingResponse(
            iterfile(),
            media_type=response.headers["Content-Type"],
            headers={"X-File-ID": str(uuid.uuid4())},
        )
    else:
        return ""


class SizeCompare(ServerRule):

    def __init__(self):
        self.errMsg = "转账金额必须大于3000"

    async def validate(self, value: ValueType) -> ValidateResult:
        # await sleep(5)
        return self.toResult(
            True if isinstance(value, float) and value > 3000 else False
        )


class StartWithRule(ClientRule):
    def __init__(self):
        self.condition = "onSubmit"
        self.name = "StartWithRule"


@action_callback(name="5continue")
async def continueActionCallback(data: dict):
    logger.info(f"执行5continue后台任务 {data}")


@on_message
async def main(message: Message):
    logger.info(f"收到消息 {message.content}")
    if message.content == "1":
        try:
            res1 = await AskUserChoiceMessage(
                timeout=180,
                choiceContent="请在以下收款人数据中做出选择：",
                items=[
                    ChoiceItem(
                        src="1.  张三     652154155112", display="", data="张三"
                    ),
                    ChoiceItem(
                        src="2.  李四     652154155582", display="", data="李四"
                    ),
                    ChoiceItem(
                        src="3.  王五     652154155578", display="", data="王五"
                    ),
                ],
                textReply=choiceFirst,
                widgets=[ButtonWidget(label="新增", data="新增")],
            ).send()
            await Message(content=res1).send()
        except AskTimeout:
            await Message(content="收款人选择已超时").send()
            return

    if message.content == "2":
        res2 = await AskActionMessage(
            content="Pick an action!",
            actions=[
                Action(
                    name="continue",
                    value="continue",
                    label="✅ Continue",
                    data="data continue",
                ),
                Action(
                    name="cancel", value="cancel", label="❌ Cancel", data="data cancel"
                ),
            ],
            textReply=choiceResultConfirm,
        ).send()
        await Message(content=res2).send()
    if message.content == "4":
        res4 = await AskUserMessage(content="你好，请录入你的姓名!", timeout=30).send()
        await Message(content=res4).send()
    if message.content == "5":
        text_content = "Hello, this is a text element."
        elements = [
            Text(name="simple_text1", content=text_content, display="inline"),
            Text(name="simple_text2", content=text_content, display="inline"),
        ]

        await Message(
            content="Check out this text element!simple_text1，simple_text2",
            elements=elements,
            actions=[
                Action(
                    name="5update",
                    value="update",
                    label="修改",
                    data={"testKey": "testValue"},
                ),
                Action(
                    name="5continue",
                    value="continue",
                    label="确认",
                    data={"testKey": "testValue"},
                ),
            ],
        ).send()
    if message.content == "6":
        elements = [
            PreviewInfoGroup(
                name="付款账户信息",
                items=[
                    DataItem(label="户名", value="张三"),
                    DataItem(label="账号", value="651541544514215", width="all"),
                ],
            ),
            PreviewInfoGroup(
                name="收款账户信息",
                items=[
                    DataItem(label="户名", value="李四"),
                    DataItem(label="账号", value="651545466455215", width="all"),
                    DataItem(label="银行", value="中国银行"),
                ],
            ),
            PreviewInfoGroup(
                name="转账信息",
                items=[
                    DataItem(label="金额", value="10,000.00 壹万元整", width="all"),
                    DataItem(
                        label="费用",
                        value="0.00",
                    ),
                    DataItem(label="附言", value="转账"),
                ],
            ),
        ]
        await Message(
            content="请核对以下转账信息符合您的预期。",
            elements=elements,
            speechContent="请核对以下转账信息符合您的预期",
        ).send()
        await Message(content="交易成功").send()

    if message.content == "7":
        image1 = Image(path="./voucher.png", name="image1", display="inline")
        # Attach the image to the message
        await Message(
            content="This message has an image!",
            elements=[image1],
        ).send()
    if message.content == "8":
        res8 = await GatherCommand(action="capture_idcard", timeout=90).send()
        logger.info(f"身份证正反面 {res8}")
    if message.content == "9":
        res9 = await GatherCommand(action="face_recognition", timeout=10).send()
        logger.info(f"人脸识别 {res9}")
    if message.content == "10":
        res10 = await GatherCommand(action="custom_card", timeout=10).send()
        logger.info(f"定制卡面 {res10}")
    if message.content == "11":
        res11 = await GatherCommand(action="password", timeout=10).send()
        logger.info(f"密码 {res11}")
        if res11:
            if res11.code == "00":
                logger.info(f"客户输入成功 {res11.data['value']}")
            else:
                logger.info("客户取消输入")
        else:
            logger.info(f"客户输入超时")

    if message.content == "12":
        res12 = await GatherCommand(
            action="scan", timeout=90, speechContent="扫一扫"
        ).send()
        if res12:
            if res12.code == "00":
                logger.info(f"客户扫描成功 {res12}")
            else:
                logger.info("客户取消扫描")
        else:
            logger.info(f"客户输入超时")
        logger.info(f"扫一扫 {res12}")
    if message.content == "14":
        speechContent = "程序意外终止"
        await AskUserMessage(
            content="你好，请录入你的姓名!", timeout=30, speechContent=speechContent
        ).send()
    if message.content == "15":
        speechContent = "在Python中，raise语句用于主动抛出异常。当程序遇到错误条件或需要中断当前执行流程以应对某种问题时，开发者可以使用raise来引发一个异常。这使得程序能够以一种可控的方式处理错误情况，而不是让程序意外终止"
        await Message(content="一条消息", speechContent=speechContent).send()
    if message.content == "16":
        await AskActionMessage(
            content="Pick an action!",
            actions=[
                Action(name="continue", value="continue", label="确认", data="确认"),
                Action(name="cancel", value="cancel", label="取消", data="取消"),
            ],
            textReply=choiceResultConfirm,
            speechContent="请点击",
            timeout=20,
        ).send()
    if message.content == "17":
        res17 = await AskUserMessage(
            content=f"验证mdLinks功能，[快捷键]({JsInterfaceEnum.PREVIEW_DRAWER.value}), [内置命令]({JsInterfaceEnum.PREVIEW_DRAWER.value})",
            timeout=30,
            speechContent="长亭外，古道边，芳草碧连天。晚风拂柳笛声残，夕阳山外山。天之涯，地之角，知交半零落",
            mdLinks=[
                MdLink(
                    data="快捷键",
                    src="""
              如果你经常需要使用这个功能，可以为其设置一个快捷键：

              打开 VS Code。
              按 Ctrl+Shift+P (Windows/Linux) 或 Cmd+Shift+P (Mac) 打开命令面板。
              输入 Preferences: Open Keyboard Shortcuts 并选择它。
              搜索 Transform to Uppercase。
              右键点击并选择 Change Keybinding，然后按下你想要设置的快捷键。
              这将会使得你可以通过自定义的快捷键快速将选中的文本转换为大写。""",
                    display="",
                ),
                MdLink(
                    data="内置命令",
                    src="""
              你也可以使用 VS Code 内置的命令来转换文本的大小写，虽然功能不如插件丰富：

              选择你想转换为大写的文本。
              按 Ctrl+Shift+P (Windows/Linux) 或 Cmd+Shift+P (Mac) 打开命令面板。
              输入 Transform to Uppercase 并选择它。选中的文本将会被转换为大写。
            """,
                    display="",
                ),
            ],
        ).send()
        await Message(content=res17).send()
    if message.content == "18":
        # 必须实现 @account_recognition @image_account_recognition
        res18 = await AccountInput(
            content="请输入付款账号",
            rules=[FixedLength(length=6, errMsg="账号长度不满足6位的要求")],
            timeout=180,
            placeholder="银行账号",
        ).send()
        logger.info(f"客户输入账号 {res18}")
        if res18:
            await Message(content=str(res18)).send()

    if message.content == "19":
        # 必须实现 @amount_recognition
        res19 = await AmountInput(rules=[SizeCompare()]).send()
        if res19:
            await Message(content="{:.2f}".format(float(res19))).send()
    if message.content == "20":
        # 必须实现 @modilephone_recognition
        """
        扩展自定义输入场规则js文件，chainlit_ready事件触发后使用installRules函数注册，内容示例

        const rules = {
          AccountAndMobilePhoneRule: (value) => {
            const length = value.length;
            if (length === 11) {
              const phoneRegex = /^1[3-9]\d{9}$/;
              return phoneRegex.test(value) || '必须是有效的11位手机号';
            } else if (length === 19) {
              const startsWith622 = /^622/;
              return startsWith622.test(value) || '必须是有效的19位银行账号';
            } else {
              return '必须是有效的11位手机号或19位银行账号';
            }
          },
          StartWithRule: (value) => {
            return value.startsWith('185') || '手机号码必须以185开头';
          }
        };
        window.addEventListener('chainlit_ready', () => {
          window.__chainlit__.installRules(rules);
        });

        """
        res20 = await MobilePhoneInput(timeout=600, rules=[StartWithRule()]).send()
        if res20:
            await Message(content=str(res20)).send()

    if message.content == "21":
        # 必须实现 @account_mobilephone_recognition
        res21 = await AccountAndMobilePhoneInput(
            rules=[AccountAndMobilePhoneRule()], timeout=180
        ).send()
        if res21:
            await Message(content=str(res21)).send()
    if message.content == "22":
        accountInput = AccountInput(
            content="请输入付款账号",
            rules=[FixedLength(length=6, errMsg="账号长度不满足6位的要求")],
            timeout=60,
            placeholder="银行账号",
        )
        asyncio.create_task(accountInput.send())
        await asyncio.sleep(5)
        await accountInput.cancel()
    if message.content == "23":
        gatherCommand = GatherCommand(action="scan", timeout=90, speechContent="扫一扫")
        asyncio.create_task(gatherCommand.send())
        await asyncio.sleep(10)
        gatherCommand.cancel()
    if message.content == "24":
        await JsFunctionCommand(
            commands=[{"name": "dark_style", "parameters": {}}]
        ).send()
    if message.content == "25":
        await JsFunctionCommand(
            commands=[{"name": "light_style", "parameters": {}}]
        ).send()
    if message.content == "26":
        await JsFunctionCommand(
            commands=[
                {"name": "dark_style", "parameters": {}},
                {"name": "add_font_size", "parameters": {"offset": 4}},
            ]
        ).send()
    if message.content == "27":
        await JsFunctionCommand(
            commands=[{"name": "reduce_font_size", "parameters": {"offset": 4}}]
        ).send()
    if message.content == "28":
        p = PreselectionMessage(
            psType="input",
            items=[
                PSInputItem(label="转账"),
                PSInputItem(label="18536403990"),
                PSInputItem(label="1852222"),
            ],
        )
        await p.send()
        res28 = await MobilePhoneInput(timeout=600, rules=[StartWithRule()]).send()
        await p.clear_input()
        if res28:
            await Message(content=str(res28)).send()

    if message.content == "29":
        # 给用户提供的预输入项
        p = PreselectionMessage(
            psType="input",
            items=[
                PSInputItem(label="10000"),
                PSInputItem(label="5000.465"),
                PSInputItem(label="2000"),
            ],
        )
        await p.send()
        res29 = await AmountInput(rules=[SizeCompare()]).send()
        if res29:
            await Message(content="{:.2f}".format(float(res29))).send()
    if message.content == "30":
        # 用户点击后回调使用@predefined_procedure注册的函数
        p = PreselectionMessage(
            content="还需要进行以下服务吗",
            psType="message",
            items=[
                PSMessageItem(
                    data="开卡",
                    src='<div style="width: 100%;padding:8px">1. 开卡<div>',
                    display="create",
                ),
                PSMessageItem(
                    data={"tradeName": "转账"},
                    src='<div style="width: 100%;padding:8px">2. 转账<div>',
                    display="create",
                ),
                PSMessageItem(
                    data="挂失",
                    src='<div style="width: 100%;padding:8px">3. 挂失<div>',
                    display="create",
                ),
            ],
        )
        await p.send()
    if message.content == "31":
        # 用户点击后回调使用@predefined_procedure注册的函数
        p = PreselectionMessage(
            content="还需要进行以下服务吗",
            psType="message",
            elements=[
                Text(
                    name="simple_text",
                    content="[执行预定义流程](/action.do?id=4567890)",
                    display="inline",
                ),
                Text(
                    name="simple_text",
                    content="[打开百度](https://www.baidu.com/)",
                    display="inline",
                ),
                Text(
                    name="simple_text",
                    content=f"[洛神赋]({JsInterfaceEnum.PREVIEW_DRAWER.value})",
                    display="inline",
                ),
            ],
            mdLinks=[
                MdLink(
                    data="洛神赋",
                    src="""
              《洛神赋》是三国时期曹魏文学家曹植所作的一篇著名赋文。以下是《洛神赋》的全文：

                黄初三年，余朝京师，还济洛川。古人有言，斯水之神，名曰宓妃。感宋玉对楚王神女之事，遂作斯赋。其辞曰：

                余从京域，言归东藩。背伊阙，越轘辕。经通谷，陵景山。日既西倾，车殆马烦。尔乃税驾乎蘅皋，秣驷乎芝田。容与乎阳林，
                
                流眄乎洛川。于是精移神骇，忽焉思散。俯则末察，仰以殊观。睹一丽人，于岩之畔。乃援御者而告之曰：“翩若惊鸿，
                
                婉若游龙。荣曜秋菊，华茂春松。髣髴兮若轻云之蔽月，飘飖兮若流风之回雪。远而望之，皎若太阳升朝霞；迫而察之，
                            
                灼若芙蕖出渌波。纤腰约素，肩若削成。修短合度，肥瘠得中。肩若削成，腰如约素。延颈秀项，皓质呈露。芳泽无加，
                            
                铅华弗御。云髻峨峨，修眉联娟。丹唇外朗，皓齿内鲜。明眸善睐，靥辅承权。瓌姿艳逸，仪静体闲。柔情绰态，
                            
                媚于语言。奇服旷世，骨像应图。披罗衣之璀粲兮，珥瑶碧之华琚。戴金翠之首饰，缀明珠以耀躯。践远游之文履，曳雾
                            
                绡之轻裾。既含睇兮又宜笑，子慕予兮善窈窕。”

                心凝形释，不能自己。回飚举兮浩宕，凌高衢兮迴壑。于时从轩后车，薄言归息。退超然奔东序，登长阶以四望。
                            
                临长津以延伫，忽怳若神，乃奄忽而逝。后汉武帝思念以致相见，莫能自已。遂曰：“惟魂兮归来！”

                于是长州主夏，吾将千岁。衔忧以终老，诚所见耳。冀魂兮归来！遨游八极，沐浴焉能。去心结累，正兹眷顾。临长江以延伫，忽怳若神，乃奄忽而逝。

                于是怀佳人兮不能忘，思绵绵而增感。怡颜远行兮目所望，俯神仙而悠哉。风翻兮眇瞩，沈思兮时望。悦兮意从，悟兮心安。乃若登高丘以望天，颓波兮失念。

                《洛神赋》以其优美的语言和细腻的描写，被后人广为传颂，成为中国古代文学中的经典之作。
                
                《洛神赋》是三国时期曹魏文学家曹植所作的一篇著名赋文。以下是《洛神赋》的全文：

                黄初三年，余朝京师，还济洛川。古人有言，斯水之神，名曰宓妃。感宋玉对楚王神女之事，遂作斯赋。其辞曰：

                余从京域，言归东藩。背伊阙，越轘辕。经通谷，陵景山。日既西倾，车殆马烦。尔乃税驾乎蘅皋，秣驷乎芝田。容与乎阳林，
                
                流眄乎洛川。于是精移神骇，忽焉思散。俯则末察，仰以殊观。睹一丽人，于岩之畔。乃援御者而告之曰：“翩若惊鸿，
                
                婉若游龙。荣曜秋菊，华茂春松。髣髴兮若轻云之蔽月，飘飖兮若流风之回雪。远而望之，皎若太阳升朝霞；迫而察之，
                            
                灼若芙蕖出渌波。纤腰约素，肩若削成。修短合度，肥瘠得中。肩若削成，腰如约素。延颈秀项，皓质呈露。芳泽无加，
                            
                铅华弗御。云髻峨峨，修眉联娟。丹唇外朗，皓齿内鲜。明眸善睐，靥辅承权。瓌姿艳逸，仪静体闲。柔情绰态，
                            
                媚于语言。奇服旷世，骨像应图。披罗衣之璀粲兮，珥瑶碧之华琚。戴金翠之首饰，缀明珠以耀躯。践远游之文履，曳雾
                            
                绡之轻裾。既含睇兮又宜笑，子慕予兮善窈窕。”

                心凝形释，不能自己。回飚举兮浩宕，凌高衢兮迴壑。于时从轩后车，薄言归息。退超然奔东序，登长阶以四望。
                            
                临长津以延伫，忽怳若神，乃奄忽而逝。后汉武帝思念以致相见，莫能自已。遂曰：“惟魂兮归来！”

                于是长州主夏，吾将千岁。衔忧以终老，诚所见耳。冀魂兮归来！遨游八极，沐浴焉能。去心结累，正兹眷顾。临长江以延伫，忽怳若神，乃奄忽而逝。

                于是怀佳人兮不能忘，思绵绵而增感。怡颜远行兮目所望，俯神仙而悠哉。风翻兮眇瞩，沈思兮时望。悦兮意从，悟兮心安。乃若登高丘以望天，颓波兮失念。

                《洛神赋》以其优美的语言和细腻的描写，被后人广为传颂，成为中国古代文学中的经典之作。
            """,
                    display="",
                )
            ],
            items=[
                PSMessageItem(
                    data="开卡",
                    src='<div style="width: 100%;padding:8px">1. 开卡<div>',
                    display="create",
                ),
                PSMessageItem(
                    data={"tradeName": "转账"},
                    src='<div style="width: 100%;padding:8px">2. 转账<div>',
                    display="create",
                ),
                PSMessageItem(
                    data="挂失",
                    src='<div style="width: 100%;padding:8px">3. 挂失<div>',
                    display="create",
                ),
            ],
        )
        await p.send()
    if message.content == "32":
        await Message(
            content="调用预定义流程",
            elements=[
                Text(
                    name="simple_text",
                    content="[执行预定义流程](/action.do?id=4567890)",
                    display="inline",
                )
            ],
        ).send()
    if message.content == "33":
        resCheck = await AskUserCheckAgreeement(
            content=f"本人已阅读并同意签署[《“闪电贷”额度合同》]({JsInterfaceEnum.AGREEMENT_DRAWER.value})[《个人资信信息（含个人征信）授权书》]({JsInterfaceEnum.AGREEMENT_DRAWER.value})",
            mdAgreementLinks=[
                MdLink(
                    data="《“闪电贷”额度合同》",
                    src="《“闪电贷”额度合同》内容",
                    display="",
                ),
                MdLink(
                    data="《个人资信信息（含个人征信）授权书》",
                    src="《个人资信信息（含个人征信）授权书》内容",
                    display="",
                ),
            ],
            textReply=agree,
            timeout=15,
        ).send()

        logger.info(f"客户签署协议 {resCheck}")
    if message.content == "34":
        await Message(
            content=f"使用[详情]({JsInterfaceEnum.PREVIEW_DRAWER.value})打开预览窗口",
            elements=[
                Text(
                    name="simple_text",
                    content=f"[element详情]({JsInterfaceEnum.PREVIEW_DRAWER.value})",
                    display="inline",
                )
            ],
            mdLinks=[
                MdLink(
                    data="详情",
                    src="""
              如果你经常需要使用这个功能，可以为其设置一个快捷键：

              打开 VS Code。
              按 Ctrl+Shift+P (Windows/Linux) 或 Cmd+Shift+P (Mac) 打开命令面板。
              输入 Preferences: Open Keyboard Shortcuts 并选择它。
              搜索 Transform to Uppercase。
              右键点击并选择 Change Keybinding，然后按下你想要设置的快捷键。
              这将会使得你可以通过自定义的快捷键快速将选中的文本转换为大写。""",
                    display="",
                ),
                MdLink(
                    data="element详情",
                    src="""
              你也可以使用 VS Code 内置的命令来转换文本的大小写，虽然功能不如插件丰富：

              选择你想转换为大写的文本。
              按 Ctrl+Shift+P (Windows/Linux) 或 Cmd+Shift+P (Mac) 打开命令面板。
              输入 Transform to Uppercase 并选择它。选中的文本将会被转换为大写。
            """,
                    display="",
                ),
            ],
        ).send()
