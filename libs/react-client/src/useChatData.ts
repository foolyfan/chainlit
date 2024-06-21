import { useRecoilValue } from 'recoil';

import {
  actionState,
  askUserState,
  avatarState,
  chatSettingsDefaultValueSelector,
  chatSettingsInputsState,
  chatSettingsValueState,
  elementState,
  gatherCommandState,
  inputState,
  listActionState,
  loadingState,
  operableMessagesState,
  preselectionState,
  sessionState,
  tasklistState,
  uiSettingsCommandState
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
  const actions = useRecoilValue(actionState);
  const listActions = useRecoilValue(listActionState);
  const session = useRecoilValue(sessionState);
  const askUser = useRecoilValue(askUserState);
  const gatherCommand = useRecoilValue(gatherCommandState);
  const chatSettingsInputs = useRecoilValue(chatSettingsInputsState);
  const chatSettingsValue = useRecoilValue(chatSettingsValueState);
  const chatSettingsDefaultValue = useRecoilValue(
    chatSettingsDefaultValueSelector
  );
  const input = useRecoilValue(inputState);
  const uiSettingsCommand = useRecoilValue(uiSettingsCommandState);
  const preselection = useRecoilValue(preselectionState);
  const operableMessages = useRecoilValue(operableMessagesState);

  const connected = session?.socket.connected && !session?.error;
  const disabled = !connected || loading || askUser?.spec.type === 'file';

  return {
    actions,
    listActions,
    askUser,
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
    input,
    uiSettingsCommand,
    preselection,
    operableMessages
  };
};

export { useChatData };
