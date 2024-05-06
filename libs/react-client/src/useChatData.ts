import { useRecoilValue } from 'recoil';

import {
  actionState,
  askUserState,
  avatarState,
  chatSettingsDefaultValueSelector,
  chatSettingsInputsState,
  chatSettingsValueState,
  choiceActionState,
  elementState,
  loadingState,
  sessionState,
  tasklistState
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
  const choiceActions = useRecoilValue(choiceActionState);
  const session = useRecoilValue(sessionState);
  const askUser = useRecoilValue(askUserState);
  const chatSettingsInputs = useRecoilValue(chatSettingsInputsState);
  const chatSettingsValue = useRecoilValue(chatSettingsValueState);
  const chatSettingsDefaultValue = useRecoilValue(
    chatSettingsDefaultValueSelector
  );

  const connected = session?.socket.connected && !session?.error;
  // 用户输入框状态：禁用、多输入方式
  const disabled = !connected || loading || askUser?.spec.type === 'file';
  const multiInput =
    !connected ||
    loading ||
    askUser?.spec.type === 'action' ||
    askUser?.spec.type === 'choice_action';

  return {
    actions,
    choiceActions,
    askUser,
    avatars,
    chatSettingsDefaultValue,
    chatSettingsInputs,
    chatSettingsValue,
    connected,
    disabled,
    multiInput,
    elements,
    error: session?.error,
    loading,
    tasklists
  };
};

export { useChatData };
