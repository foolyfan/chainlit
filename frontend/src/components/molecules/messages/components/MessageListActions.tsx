import cloneDeep from 'lodash/cloneDeep';
import { memo, useCallback, useEffect, useState } from 'react';

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

const MemoListActions = memo(
  ({
    listActions,
    layout,
    onClick
  }: {
    listActions: IListAction[];
    layout?: IChoiceLayout[];
    onClick: (action: IListAction) => void;
  }) => {
    const [choiceActions, setChoiceActions] = useState<IChoiceAction[]>([]);
    const [externalActions, setExternalActions] = useState<IExternalAction[]>(
      []
    );
    const [choiceImageActions, setChoiceImageActions] = useState<
      IChoiceImageAction[]
    >([]);

    useEffect(() => {
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
      }
      setChoiceActions(tChoiceActions);
      setChoiceImageActions(tChoiceImageActions);
      setExternalActions(tChoiceExternalActions);
    }, [listActions]);
    const show =
      choiceActions.length ||
      externalActions.length ||
      choiceImageActions.length;

    if (!show) {
      return null;
    }

    return (
      <>
        {choiceActions.length ? (
          <DataListAction
            choiceActions={choiceActions}
            layout={layout}
            onClick={onClick}
          />
        ) : null}
        {choiceImageActions.length ? (
          <ListWithSize
            elements={choiceImageActions}
            renderElement={(ctx) => (
              <MessageImageAction
                element={ctx.element}
                onClick={() => onClick(ctx.element)}
              />
            )}
          />
        ) : null}
        {externalActions
          ? externalActions.map((externalAction) => (
              <Button
                variant="outlined"
                sx={{ width: '100%', marginTop: '20px' }}
                onClick={() => onClick(externalAction)}
              >
                {externalAction.label}
              </Button>
            ))
          : null}
      </>
    );
  }
);

export const MessageListActions = ({ message, listActions, layout }: Props) => {
  const [displayListActions, setDisplayListActions] = useState<IListAction[]>(
    []
  );
  const [displayLayout, setDisplayLayout] = useState<IChoiceLayout[]>([]);
  const [history, setHistory] = useState<boolean>(false);
  const { askUser } = useChatData();
  useEffect(() => {
    if (
      askUser?.spec.type !== 'list_action' &&
      listActions.length &&
      listActions[0].forId !== message.id
    ) {
      return;
    }
    if (listActions.length < displayListActions.length) {
      setHistory(true);
      return;
    }
    if (layout) {
      setDisplayLayout([...layout]);
    }
    setDisplayListActions(cloneDeep(listActions));
  }, [listActions]);

  const handleClick = useCallback((action: IListAction) => {
    if (history) {
      return;
    }
    askUser?.callback({
      id: action.id,
      forId: action.forId,
      type: 'click',
      value: action.id
    });
  }, []);
  return (
    <MemoListActions
      listActions={displayListActions}
      layout={displayLayout}
      onClick={handleClick}
    />
  );
};
