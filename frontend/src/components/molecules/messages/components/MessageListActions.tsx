import cloneDeep from 'lodash/cloneDeep';
import {
  RefObject,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import { Button } from '@mui/material';

import {
  type IChoiceAction,
  IChoiceImageAction,
  type IChoiceLayout,
  IExternalAction,
  IListAction,
  type IStep,
  useChatContext,
  useChatData
} from '@chainlit/react-client';

import { ActionMask } from './ActionMask';
import { ListWithSize } from './ListWithSize';
import { MessageImageAction } from './MessageImageAction';
import { DataListAction } from './listactions/DataListAction';

interface Props {
  message: IStep;
  listActions: IListAction[];
  layout?: IChoiceLayout[];
  ref: RefObject<any>;
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
  const { askUser } = useChatData();
  const [history, setHistory] = useState<boolean>(false);
  const [displayMessage, setDisplayMessage] = useState<IStep | undefined>(
    undefined
  );
  const { stopPlayer, setActionRef } = useChatContext();

  const ref = useRef({ toHistory: () => setHistory(true) });

  useEffect(() => {
    setDisplayMessage({ ...message });
    if (layout) {
      setDisplayLayout([...layout]);
    }
  }, []);

  useEffect(() => {
    if (askUser?.spec.type !== 'list_action') {
      return;
    }

    if (!(listActions.length && listActions[0].forId == displayMessage?.id)) {
      return;
    }
    setActionRef(ref);

    setDisplayListActions(cloneDeep(listActions));
  }, [listActions, displayMessage]);

  const handleClick = useCallback((action: IListAction) => {
    setHistory(true);
    stopPlayer();
    askUser?.callback({
      id: action.id,
      forId: action.forId,
      type: 'click',
      value: action.id
    });
  }, []);

  return (
    <>
      {displayListActions.length ? <ActionMask show={history} /> : null}
      <MemoListActions
        listActions={displayListActions}
        layout={displayLayout}
        onClick={handleClick}
      />
    </>
  );
};
