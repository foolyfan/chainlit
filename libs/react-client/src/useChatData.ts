import { useRecoilValue } from 'recoil';

import {
  avatarState,
  behaviorHandlersState,
  chatSettingsDefaultValueSelector,
  chatSettingsInputsState,
  chatSettingsValueState,
  elementState,
  gatherCommandState,
  loadingState,
  operableMessagesState,
  preselectionState,
  sessionState,
  tasklistState,
  userFutureMessageState
} from './state';

export interface IToken {
  id: number | string;
  token: string;
  isSequence: boolean;
}

const useChatData = () => {
  const loading = useRecoilValue(loadingState);
  const elements = useRecoilValue(elementState);
  const avatars = useRecoilValue(avatarState);
  const tasklists = useRecoilValue(tasklistState);
  const session = useRecoilValue(sessionState);
  const gatherCommand = useRecoilValue(gatherCommandState);
  const chatSettingsInputs = useRecoilValue(chatSettingsInputsState);
  const chatSettingsValue = useRecoilValue(chatSettingsValueState);
  const chatSettingsDefaultValue = useRecoilValue(
    chatSettingsDefaultValueSelector
  );
  const behaviorHandlers = useRecoilValue(behaviorHandlersState);
  const preselection = useRecoilValue(preselectionState);
  const operableMessages = useRecoilValue(operableMessagesState);
  const userFutureMessage = useRecoilValue(userFutureMessageState);

  const connected = session?.socket.connected && !session?.error;
  const disabled = !connected || loading;

  return {
    avatars,
    chatSettingsDefaultValue,
    chatSettingsInputs,
    chatSettingsValue,
    connected,
    disabled,
    elements,
    error: session?.error,
    loading,
    tasklists,
    gatherCommand,
    behaviorHandlers,
    preselection,
    operableMessages,
    userFutureMessage
  };
};

export { useChatData };
