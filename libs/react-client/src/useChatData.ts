import { useRecoilValue } from 'recoil';

import {
  avatarState,
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
  uiSettingsCommandState,
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
  const uiSettingsCommand = useRecoilValue(uiSettingsCommandState);
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
    uiSettingsCommand,
    preselection,
    operableMessages,
    userFutureMessage
  };
};

export { useChatData };
