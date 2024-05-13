import { useEffect, useState } from 'react';

import { Button } from '@mui/material';

import {
  type IChoiceAction,
  IChoiceImageAction,
  type IChoiceLayout,
  IExternalAction,
  IListAction,
  type IStep,
  useChatData
} from '@chainlit/react-client';

import { DataListAction } from './listactions/DataListAction';

interface Props {
  message: IStep;
  listActions: IListAction[];
  layout?: IChoiceLayout[];
}

export const MessageListActions = ({ message, listActions, layout }: Props) => {
  const [choiceActions, setChoiceActions] = useState<IChoiceAction[]>([]);
  const [externalAction, setExternalAction] = useState<
    IExternalAction | undefined
  >(undefined);
  const [choiceImageActions, setChoiceImageActions] = useState<
    IChoiceImageAction[]
  >([]);
  const { askUser } = useChatData();
  useEffect(() => {
    if (
      askUser?.spec.type !== 'list_action' &&
      listActions[0].forId !== message.id
    ) {
      return;
    }
    const len = listActions.length;
    const tChoiceActions = [];
    const tChoiceImageActions = [];
    for (let index = 0; index < len; index++) {
      const action = listActions[index];
      switch (action.type) {
        case 'data':
          tChoiceActions.push(action as IChoiceAction);
          break;
        case 'external':
          setExternalAction(action as IExternalAction);
          break;
        case 'image':
          tChoiceImageActions.push(action as IChoiceImageAction);
          break;
        default:
          break;
      }
      setChoiceActions(tChoiceActions);
      setChoiceImageActions(tChoiceImageActions);
    }
  }, [listActions]);
  const show = choiceActions || externalAction || choiceImageActions;

  if (!show) {
    return null;
  }
  const handleClick = (action: IListAction) => {
    askUser?.callback({
      id: action.id,
      forId: action.forId,
      type: 'click',
      value: action.id
    });
  };

  return (
    <>
      {choiceActions.length ? (
        <DataListAction
          choiceActions={choiceActions}
          layout={layout}
          onClick={handleClick}
        />
      ) : null}
      {externalAction ? (
        <Button
          variant="outlined"
          sx={{ width: '100%', marginTop: '20px' }}
          onClick={() => handleClick(externalAction)}
        >
          {externalAction.label}
        </Button>
      ) : null}
      {choiceImageActions.length ? <div>图片</div> : null}
    </>
  );
};
