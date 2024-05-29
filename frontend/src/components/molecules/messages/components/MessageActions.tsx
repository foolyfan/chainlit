import { MessageContext } from 'contexts/MessageContext';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import {
  type IAction,
  type IStep,
  useChatContext
} from '@chainlit/react-client';

import { ActionButton } from './ActionButton';
import { ActionDrawerButton } from './ActionDrawerButton';
import { ActionMask } from './ActionMask';

interface Props {
  message: IStep;
  actions: IAction[];
}

const MessageActions = ({ message, actions }: Props) => {
  const [displayedActions, setDisplayedActions] = useState<IAction[]>([]);
  const [displayedDrawerActions, setDisplayedDrawerActions] = useState<
    IAction[]
  >([]);

  const { askUser } = useContext(MessageContext);

  const [history, setHistory] = useState<boolean>(false);

  const { abortAudioTask, setActionRef } = useChatContext();

  const ref = useRef({ toHistory: () => setHistory(true) });

  useEffect(() => {
    const scopedActions = actions.filter((a) => {
      if (a.forId) {
        return a.forId === message.id;
      }
      return true;
    });
    if (!scopedActions.length) {
      return;
    }
    if (actions.length < displayedActions.length) {
      setHistory(true);
      return;
    }
    setActionRef(ref);
    setDisplayedActions(scopedActions.filter((a) => !a.collapsed));
    setDisplayedDrawerActions(scopedActions.filter((a) => a.collapsed));
  }, [actions]);

  const handleClick = useCallback(
    (action: IAction) => {
      setHistory(true);
      abortAudioTask();
      askUser?.callback({
        id: action.id,
        forId: action.forId,
        value: action.id,
        type: 'click'
      });
    },
    [askUser, abortAudioTask]
  );

  return (
    <>
      {displayedActions.length || displayedDrawerActions.length ? (
        <ActionMask show={history} />
      ) : null}
      <Stack
        direction="row"
        spacing={1}
        alignItems="start"
        justifyContent="space-between"
        width="100%"
      >
        <Box id="actions-list">
          {displayedActions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              margin={'2px 8px 6px 0'}
              onClick={() => handleClick(action)}
              display={history}
            />
          ))}
          {displayedDrawerActions.length ? (
            <ActionDrawerButton actions={displayedDrawerActions} />
          ) : null}
        </Box>
      </Stack>
    </>
  );
};

export { MessageActions };
