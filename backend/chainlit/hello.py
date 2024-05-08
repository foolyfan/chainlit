# This is a simple example of a chainlit app.

from typing import List

from chainlit.element import Text
from chainlit.extensions.choiceaction import ChoiceAction
from chainlit.extensions.element import DataItem, PreviewInfoGroup
from chainlit.extensions.message import AskUserChoiceMessage
from chainlit.logger import logger
from chainlit.types import AskUserResponse

from chainlit import (
    Action,
    AskActionMessage,
    AskUserMessage,
    Message,
    Task,
    TaskList,
    TaskStatus,
    on_message,
    sleep,
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


@on_message
async def main(message: Message):
    if message.content == "1":
        res = await AskUserChoiceMessage(
            timeout=30,
            datadef="收款人",
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
                actiondef="确认",
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
            actiondef="确认",
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
        ).send()
        res = await AskActionMessage(
            actiondef="确认",
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
