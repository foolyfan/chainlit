import { useMessageContext } from 'contexts/MessageContext';
import { useCallback } from 'react';
import { useRecoilValue } from 'recoil';

import {
  ChoiceItem,
  ChoiceSpec,
  type IStep,
  useChatInteract
} from '@chainlit/react-client';

import { projectSettingsState } from 'state/project';

import { ListFrame } from './ListFrame';

interface Props {
  attach: ChoiceSpec;
  message: IStep;
  disabled: boolean;
}

export const MessageChoices = ({ message, attach, disabled }: Props) => {
  const { addWaitingMessage, replyAskMessage } = useChatInteract();
  const projectSettings = useRecoilValue(projectSettingsState);
  const { createUserMessage } = useMessageContext();
  const handleClick = useCallback((item: ChoiceItem, index: number) => {
    replyAskMessage(
      message.id,
      createUserMessage(`第 ${index + 1} 项`),
      'touch',
      item.data
    );
    addWaitingMessage(projectSettings!.ui.name);
  }, []);

  return (
    <ListFrame onClick={handleClick} disabled={disabled} items={attach.items} />
  );
};
