# This is a simple example of a chainlit app.

import json
import os
import uuid
from typing import List

import aiofiles
import httpx
from chainlit.element import Image, Text
from chainlit.extensions.element import DataItem, PreviewInfoGroup
from chainlit.extensions.listaction import (
    LA,
    ChoiceAction,
    ChoiceImageAction,
    ExternalAction,
)
from chainlit.extensions.message import AskUserChoiceMessage, GatherCommand
from chainlit.logger import logger
from chainlit.types import AskUserResponse
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from chainlit import (
    Action,
    AskActionMessage,
    AskUserMessage,
    Message,
    Task,
    TaskList,
    TaskStatus,
    asr_method,
    on_message,
    sleep,
    tts_method,
)


async def choiceFirst(res, choices: List[ChoiceAction]):
    logger.info(f"用户选择结果：{res}")
    logger.info(f"默认选择第一条")
    return choices[0]


async def choiceResultConfirm(res: AskUserResponse, actions):
    logger.info(f"用户确认结果：{res}")
    if res["type"] == "text":
        logger.info("调用AI选择")
        return actions[1]
    else:
        return actions[0]


async def confirmTradePreviewInfo(res: AskUserResponse, actions):
    logger.info(f"用户确认结果：{res}")
    if res["type"] == "text":
        logger.info("调用AI选择")
        return actions[1]
    else:
        return actions[0]


async def choiceBranch(res, choices: List[LA]):
    logger.info(f"用户选择机构结果 {res}")
    return choices[0]


@asr_method
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
        async with httpx.AsyncClient(timeout) as client:
            response = await client.get(url, params=params)
    except:
        print("文本解析失败")
        return ""

    if response.status_code == 200:
        logger.info("文本解析成功")

        async def iterfile():
            async for chunk in response.aiter_bytes():
                yield chunk

        return StreamingResponse(
            iterfile(),
            media_type=response.headers["Content-Type"],
            headers={"X-File-ID": str(uuid.uuid4())},
        )
    else:
        return ""


@on_message
async def main(message: Message):
    if message.content == "1":
        res = await AskUserChoiceMessage(
            timeout=30,
            choiceContent="请在以下收款人数据中做出选择：",
            layout=[{"field": "name", "width": 20}, {"field": "accNo", "width": 50}],
            choiceActions=[
                ChoiceAction(data={"name": "张三", "accNo": "652154155112"}),
                ChoiceAction(data={"accNo": "652154155582", "name": "李四"}),
                ChoiceAction(data={"accNo": "652154155578", "name": "王五"}),
            ],
            choiceHook=choiceFirst,
        ).send()
        if res is not None:
            await Message(
                content=f"根据您的要求，我将使用以下数据：\n姓名：{res.data['name']}\n账号：{res.data['accNo']}\n作为选择收款人的结果。"
            ).send()
            res = await AskActionMessage(
                content="请确认以上收款人信息",
                actions=[
                    Action(name="continue", value="continue", label="确认"),
                    Action(name="cancel", value="cancel", label="取消"),
                ],
                choiceHook=choiceResultConfirm,
                timeout=30,
            ).send()

    if message.content == "2":
        res = await AskActionMessage(
            content="Pick an action!",
            actions=[
                Action(name="continue", value="continue", label="✅ Continue"),
                Action(name="cancel", value="cancel", label="❌ Cancel"),
            ],
            choiceHook=choiceResultConfirm,
        ).send()
    if message.content == "3":
        # Create the TaskList
        task_list = TaskList()
        task_list.status = "Running..."

        # Create a task and put it in the running state
        task1 = Task(title="Processing data", status=TaskStatus.RUNNING)
        await task_list.add_task(task1)
        # Create another task that is in the ready state
        task2 = Task(title="Performing calculations", status=TaskStatus.READY)
        await task_list.add_task(task2)

        # Optional: link a message to each task to allow task navigation in the chat history
        message_id = await Message(content="Started processing data").send()
        task1.forId = message_id

        # Update the task list in the interface
        await task_list.send()

        # Perform some action on your end
        await sleep(1)

        # Update the task statuses
        task1.status = TaskStatus.DONE
        task2.status = TaskStatus.FAILED
        task_list.status = "Failed"
        await task_list.send()
    if message.content == "4":
        res = await AskUserMessage(content="你好，请录入你的姓名!", timeout=10).send()
    if message.content == "5":
        text_content = "Hello, this is a text element."
        elements = [Text(name="simple_text", content=text_content, display="inline")]

        await Message(
            content="Check out this text element!",
            elements=elements,
            actions=[
                Action(name="update", value="update", label="修改"),
                Action(name="continue", value="continue", label="确认"),
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
        res = await AskActionMessage(
            actions=[
                Action(name="update", value="update", label="修改"),
                Action(name="submit", value="submit", label="确认"),
            ],
            content="选择确认后系统将进行转账操作；若不符合，请指出错误",
            timeout=30,
            choiceHook=confirmTradePreviewInfo,
        ).send()
        if res is not None:
            if res.value == "update":
                res = await AskUserMessage(content="请描述错误", timeout=20).send()
            if res is not None:
                logger.info("AI识别修改信息，进行修改流程")
                await Message(content="正在进行修改").send()
                await Message(content="修改完成").send()
            else:
                await Message(content="交易成功").send()
    if message.content == "7":
        image1 = Image(path="./voucher.png", name="image1", display="inline")
        # Attach the image to the message
        await Message(
            content="This message has an image!",
            elements=[image1],
        ).send()
    if message.content == "8":
        res = await GatherCommand(action="capture_idcard", timeout=90).send()
        logger.info(f"身份证正反面 {res}")
    if message.content == "9":
        res = await GatherCommand(action="face_recognition", timeout=10).send()
        logger.info(f"人脸识别 {res}")
    if message.content == "10":
        res = await GatherCommand(action="custom_card", timeout=10).send()
        logger.info(f"定制卡面 {res}")
    if message.content == "11":
        res = await GatherCommand(action="password", timeout=90).send()
        logger.info(f"密码 {res}")
    if message.content == "12":
        res = await GatherCommand(
            action="scan", timeout=90, speechContent="扫一扫"
        ).send()
        logger.info(f"扫一扫 {res}")
    if message.content == "13":
        res = await AskUserChoiceMessage(
            timeout=60,
            choiceContent="请选择开户网点：",
            layout=[
                {"field": "name", "width": 30},
                {"field": "address", "width": 30},
                {"field": "workData", "width": 30},
            ],
            choiceActions=[
                ChoiceAction(
                    data={
                        "name": "北京分行营业部",
                        "address": "北京市东城区朝阳门北大街8号富华大厦E座1楼",
                        "workData": "周一至周日:\n09:00-17:00",
                    }
                ),
                ChoiceAction(
                    data={
                        "name": "北京国际大厦支行",
                        "address": "北京市朝阳区建外街道建国门外大街19号",
                        "workData": "周一至周日:\n09:00-17:00",
                    }
                ),
                ExternalAction(label="新增网点"),
                ChoiceImageAction(path="./voucher.png", imageName="凭证图片"),
                ChoiceImageAction(path="./voucher.png", imageName="凭证图片"),
                ChoiceImageAction(path="./voucher.png", imageName="凭证图片"),
                ChoiceImageAction(path="./voucher.png", imageName="凭证图片"),
                ChoiceImageAction(path="./voucher.png", imageName="凭证图片"),
            ],
            choiceHook=choiceBranch,
            speechContent="请选择",
        ).send()
        if res is not None:
            await Message(
                content=f"根据您的要求，我将使用以下数据：\n网点名称：{res.data['name']}\n网点地址：{res.data['address']}\n作为选择开户机构的结果。"
            ).send()
            res = await AskActionMessage(
                content="请确认以上开户机构信息",
                actions=[
                    Action(name="continue", value="continue", label="确认"),
                    Action(name="cancel", value="cancel", label="取消"),
                ],
                choiceHook=choiceResultConfirm,
                timeout=30,
            ).send()
    if message.content == "14":
        speechContent = "程序意外终止"
        res = await AskUserMessage(
            content="你好，请录入你的姓名!", timeout=30, speechContent=speechContent
        ).send()
    if message.content == "15":
        speechContent = "在Python中，raise语句用于主动抛出异常。当程序遇到错误条件或需要中断当前执行流程以应对某种问题时，开发者可以使用raise来引发一个异常。这使得程序能够以一种可控的方式处理错误情况，而不是让程序意外终止"
        res = await Message(
            content="你好，请录入你的姓名!", speechContent=speechContent
        ).send()
    if message.content == "16":
        res = await AskActionMessage(
            content="Pick an action!",
            actions=[
                Action(name="continue", value="continue", label="✅ Continue"),
                Action(name="cancel", value="cancel", label="❌ Cancel"),
            ],
            choiceHook=choiceResultConfirm,
            speechContent="请点击",
        ).send()
