# This is a simple example of a chainlit app.

import asyncio
import json
import os
import uuid
from typing import List, Union

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
    AskUserChoiceMessage,
    GatherCommand,
    PreselectionMessage,
    PSPromptItem,
    UISettingsCommand,
)
from chainlit.extensions.types import (
    BrightnessModeOptions,
    ChoiceItem,
    FontOptions,
    FontSizeOptions,
    PSMessageItem,
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
    preselection_callback,
    sleep,
    tts_method,
)


async def choiceFirst(res: str, choices: List[ChoiceItem]) -> Union[dict, str]:
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
        self.body = """
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
"""


"""
静态注册
"""


@preselection_callback("first")
async def first(value: Union[dict, str]):
    logger.info(f"first callback: {value}")
    await Message(content="I'm first").send()


@preselection_callback("second")
async def second(value: Union[dict, str]):
    logger.info(f"second callback: {value}")
    await Message(content="I'm second").send()


"""
动态或运行时注册
"""


async def third(value: Union[dict, str]):
    logger.info(f"third callback: {value}")
    await Message(content="I'm third").send()


preselection_callback("third")(third)


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
        self.body = """
      return value.startsWith('185') || '手机号码必须以185开头';
    """


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
        elements = [Text(name="simple_text", content=text_content, display="inline")]

        await Message(
            content="Check out this text element!",
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
            content="你好，请录入你的姓名!",
            timeout=30,
            speechContent="长亭外，古道边，芳草碧连天。晚风拂柳笛声残，夕阳山外山。天之涯，地之角，知交半零落",
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
        await UISettingsCommand(options=BrightnessModeOptions(mode="dark")).send()
    if message.content == "25":
        await UISettingsCommand(options=BrightnessModeOptions(mode="light")).send()
    if message.content == "26":
        await UISettingsCommand(
            options=FontOptions(fontSize=FontSizeOptions(type="add", offset=4))
        ).send()
    if message.content == "27":
        await UISettingsCommand(
            options=FontOptions(fontSize=FontSizeOptions(type="reduce", offset=4))
        ).send()
    if message.content == "28":
        p = PreselectionMessage(
            psType="prompt",
            items=[
                PSPromptItem(label="转账"),
                PSPromptItem(label="18536403990"),
                PSPromptItem(label="1852222"),
            ],
        )
        await p.send()
        res28 = await MobilePhoneInput(timeout=600, rules=[StartWithRule()]).send()
        await p.clear_prompt()
        if res28:
            await Message(content=str(res28)).send()

    if message.content == "29":
        p = PreselectionMessage(
            psType="prompt",
            items=[
                PSPromptItem(label="10000"),
                PSPromptItem(label="5000.465"),
                PSPromptItem(label="2000"),
            ],
        )
        await p.send()
        res29 = await AmountInput(rules=[SizeCompare()]).send()
        if res29:
            await Message(content="{:.2f}".format(float(res29))).send()
    if message.content == "30":
        # 用户点击后回调使用@preselection_callback注册的函数
        p = PreselectionMessage(
            content="还需要进行以下服务吗",
            psType="message",
            items=[
                PSMessageItem(
                    name="first",
                    data="开卡",
                    src='<div style="width: 100%;padding:8px">1. 开卡<div>',
                    display="create",
                ),
                PSMessageItem(
                    name="second",
                    data="转账",
                    src='<div style="width: 100%;padding:8px">2. 转账<div>',
                    display="create",
                ),
                PSMessageItem(
                    name="third",
                    data="挂失",
                    src='<div style="width: 100%;padding:8px">3. 挂失<div>',
                    display="create",
                ),
            ],
        )
        await p.send()
    if message.content == "31":
        # 附带elements的预选项
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
        p = PreselectionMessage(
            content="还需要进行以下服务吗",
            psType="message",
            elements=elements,
            items=[
                PSMessageItem(
                    name="first",
                    data="开卡",
                    src='<div style="width: 100%;padding:8px">1. 开卡<div>',
                    display="create",
                ),
                PSMessageItem(
                    name="second",
                    data="转账",
                    src='<div style="width: 100%;padding:8px">2. 转账<div>',
                    display="create",
                ),
                PSMessageItem(
                    name="third",
                    data="挂失",
                    src='<div style="width: 100%;padding:8px">3. 挂失<div>',
                    display="create",
                ),
            ],
        )
        await p.send()
