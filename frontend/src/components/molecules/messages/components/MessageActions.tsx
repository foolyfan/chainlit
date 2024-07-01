import { useMessageContext } from 'contexts/MessageContext';
import { useCallback, useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import {
  type IAction,
  type IStep,
  MessageSpec,
  useChatContext,
  useChatData,
  useChatInteract
} from '@chainlit/react-client';

import { projectSettingsState } from 'state/project';

import { ActionButton } from './ActionButton';
import { ActionDrawerButton } from './ActionDrawerButton';

interface Props {
  message: IStep;
  attach: MessageSpec;
  disabled: boolean;
}

const MessageActions = ({ message, attach, disabled }: Props) => {
  const [innerActions, setInnerActions] = useState<IAction[]>([]);
  const [innerDrawerActions, setInnerDrawerActions] = useState<IAction[]>([]);

  const { abortAudioTask } = useChatContext();
  const { addWaitingMessage, replyAskMessage, callAction } = useChatInteract();
  const { userFutureMessage } = useChatData();
  const projectSettings = useRecoilValue(projectSettingsState);

  const { createUserMessage } = useMessageContext();
  const handleClick = useCallback((item: IAction) => {
    abortAudioTask();
    if (userFutureMessage.type == 'question') {
      callAction(item);
    }
    if (userFutureMessage.type == 'reply') {
      replyAskMessage(
        message.id,
        createUserMessage(`${item.label}`),
        'touch',
        item.data
      );
      addWaitingMessage(projectSettings!.ui.name);
    }
  }, []);

  useEffect(() => {
    if (attach.actions) {
      setInnerActions(attach.actions.filter((a) => !a.collapsed));
      setInnerDrawerActions(attach.actions.filter((a) => a.collapsed));
    }
  }, [attach]);

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="start"
      justifyContent="space-between"
      width="100%"
    >
      <Box id="actions-list">
        {innerActions.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            margin={'2px 8px 6px 0'}
            onClick={() => handleClick(action)}
            disabled={disabled}
          />
        ))}
        {innerDrawerActions.length ? (
          <ActionDrawerButton
            actions={innerDrawerActions}
            disabled={disabled}
          />
        ) : null}
      </Box>
    </Stack>
  );
};

export { MessageActions };
