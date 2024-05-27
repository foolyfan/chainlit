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

import { ListWithSize } from './ListWithSize';
import { MessageImageAction } from './MessageImageAction';
import { DataListAction } from './listactions/DataListAction';

interface Props {
  message: IStep;
  listActions: IListAction[];
  layout?: IChoiceLayout[];
}

export const MessageListActions = ({ message, listActions, layout }: Props) => {
  const [choiceActions, setChoiceActions] = useState<IChoiceAction[]>([]);
  const [externalActions, setExternalActions] = useState<IExternalAction[]>([]);
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
    const tChoiceExternalActions = [];
    for (let index = 0; index < len; index++) {
      const action = listActions[index];
      switch (action.type) {
        case 'data':
          tChoiceActions.push(action as IChoiceAction);
          break;
        case 'external':
          tChoiceExternalActions.push(action as IExternalAction);
          break;
        case 'image':
          tChoiceImageActions.push(action as IChoiceImageAction);
          break;
        default:
          break;
      }
      setChoiceActions(tChoiceActions);
      setChoiceImageActions(tChoiceImageActions);
      setExternalActions(tChoiceExternalActions);
    }
  }, [listActions]);
  const show = choiceActions || externalActions || choiceImageActions;

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
      {choiceImageActions.length ? (
        <ListWithSize
          elements={choiceImageActions}
          renderElement={(ctx) => (
            <MessageImageAction
              element={ctx.element}
              onClick={() => handleClick(ctx.element)}
            />
          )}
        />
      ) : null}
      {externalActions
        ? externalActions.map((externalAction) => (
            <Button
              variant="outlined"
              sx={{ width: '100%', marginTop: '20px' }}
              onClick={() => handleClick(externalAction)}
            >
              {externalAction.label}
            </Button>
          ))
        : null}
    </>
  );
};
