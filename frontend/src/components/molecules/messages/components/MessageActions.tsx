import { useAuth } from 'api/auth';
import { MessageContext } from 'contexts/MessageContext';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { v4 as uuidv4 } from 'uuid';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import {
  type IAction,
  IGatherCommandResponse,
  type IStep,
  useChatContext,
  useChatInteract
} from '@chainlit/react-client';

import { projectSettingsState } from 'state/project';

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
  const { addWaitingMessage, replyMessage } = useChatInteract();
  const projectSettings = useRecoilValue(projectSettingsState);

  const ref = useRef({
    toHistory: (status: boolean = true) => setHistory(status)
  });

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

  const { user } = useAuth();
  const onReply = useCallback(
    async (
      msg: string,
      spec?: {
        asr?: boolean;
        cmdRes?: IGatherCommandResponse;
        action?: IAction;
      }
    ) => {
      const message: IStep = {
        threadId: '',
        id: uuidv4(),
        name: user?.identifier || 'User',
        type: 'user_message',
        output: msg,
        createdAt: new Date().toISOString()
      };

      replyMessage(message, spec);
      addWaitingMessage(projectSettings!.ui.name);
    },
    [user, replyMessage]
  );

  const handleClick = useCallback(
    (action: IAction) => {
      setHistory(true);
      abortAudioTask();
      onReply('', {
        action
      });
    },
    [askUser, abortAudioTask, onReply]
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
