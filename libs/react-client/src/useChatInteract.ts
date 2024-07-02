import { cloneDeep } from 'lodash';
import { useCallback } from 'react';
import {
  useRecoilState,
  useRecoilValue,
  useResetRecoilState,
  useSetRecoilState
} from 'recoil';
import {
  accessTokenState,
  avatarState,
  chatSettingsInputsState,
  chatSettingsValueState,
  elementState,
  firstUserInteraction,
  gatherCommandState,
  loadingState,
  messagesState,
  operableMessagesState,
  sessionIdState,
  sessionState,
  tasklistState,
  threadIdToResumeState,
  tokenCountState,
  userFutureMessageState
} from 'src/state';
import {
  BaseSpec,
  IAction,
  IGatherCommandResponse,
  IStep,
  UserInputType
} from 'src/types';
import { addMessage } from 'src/utils/message';

import { ChainlitAPI } from './api';
import { useChatContext } from './chatContext';

const useChatInteract = () => {
  const accessToken = useRecoilValue(accessTokenState);
  const session = useRecoilValue(sessionState);
  const gatherCommand = useRecoilValue(gatherCommandState);
  const sessionId = useRecoilValue(sessionIdState);

  const resetChatSettings = useResetRecoilState(chatSettingsInputsState);
  const resetSessionId = useResetRecoilState(sessionIdState);
  const resetChatSettingsValue = useResetRecoilState(chatSettingsValueState);

  const setFirstUserInteraction = useSetRecoilState(firstUserInteraction);
  const setLoading = useSetRecoilState(loadingState);
  const setMessages = useSetRecoilState(messagesState);
  const setElements = useSetRecoilState(elementState);
  const setAvatars = useSetRecoilState(avatarState);
  const setTasklists = useSetRecoilState(tasklistState);
  const setTokenCount = useSetRecoilState(tokenCountState);
  const setIdToResume = useSetRecoilState(threadIdToResumeState);
  const [operableMessages, setOperableMessages] = useRecoilState(
    operableMessagesState
  );
  const setUserFutureMessage = useSetRecoilState(userFutureMessageState);

  const { abortAudioTask } = useChatContext();

  const clear = useCallback(() => {
    session?.socket.emit('clear_session');
    session?.socket.disconnect();
    setIdToResume(undefined);
    resetSessionId();
    setFirstUserInteraction(undefined);
    setMessages([]);
    setElements([]);
    setAvatars([]);
    setTasklists([]);
    setTokenCount(0);
    resetChatSettings();
    resetChatSettingsValue();
  }, [session]);

  const sendMessage = useCallback(
    (message: IStep) => {
      abortAudioTask();

      setMessages((oldMessages) => addMessage(oldMessages, message));
      console.log('emit ui_message', message);
      session?.socket.emit('ui_message', { message });
    },
    [session?.socket, abortAudioTask]
  );

  const replyAskMessage = useCallback(
    (parentId: string, message: IStep, type: UserInputType, data?: any) => {
      setMessages((oldMessages) => addMessage(oldMessages, message));
      console.log(`reply ask parent ${parentId} message ${message}`);
      (operableMessages[parentId].attach as BaseSpec).callback!({
        data: type == 'touch' ? data : message.output,
        type
      });
      setOperableMessages((oldMessages) => {
        const newMessages = cloneDeep(oldMessages);
        newMessages[parentId].active = false;
        return newMessages;
      });
      setUserFutureMessage({ type: 'question' });
    },
    [operableMessages]
  );

  const replyCmdMessage = useCallback(
    (cmdRes: IGatherCommandResponse) => {
      abortAudioTask();
      if (gatherCommand) {
        console.log('reply gatherCommand message', cmdRes);
        gatherCommand.callback(cmdRes);
      }
    },
    [gatherCommand, abortAudioTask]
  );

  const updateChatSettings = useCallback(
    (values: object) => {
      session?.socket.emit('chat_settings_change', values);
    },
    [session?.socket]
  );

  const stopTask = useCallback(() => {
    setLoading(false);
    session?.socket.emit('stop');
  }, [session?.socket]);

  const callAction = useCallback(
    (action: IAction) => {
      const socket = session?.socket;
      if (!socket) return;

      socket.emit('action_call', action);
    },
    [session?.socket]
  );

  const callPredefinedProcedure = useCallback(
    (data: any) => {
      const socket = session?.socket;
      if (!socket) return;
      socket.emit('predefined_procedure_call', data);
    },
    [session?.socket]
  );

  const uploadFile = useCallback(
    (
      client: ChainlitAPI,
      file: File,
      onProgress: (progress: number) => void
    ) => {
      return client.uploadFile(file, onProgress, sessionId, accessToken);
    },
    [sessionId, accessToken]
  );

  const addWaitingMessage = useCallback((name: string) => {
    const waitingMessage: IStep = {
      id: 'virtual',
      name: name,
      type: 'waiting',
      output: 'loading',
      createdAt: ''
    };
    setMessages((oldMessages) => addMessage([...oldMessages], waitingMessage));
  }, []);
  return {
    uploadFile,
    callAction,
    clear,
    sendMessage,
    stopTask,
    setIdToResume,
    updateChatSettings,
    addWaitingMessage,
    replyCmdMessage,
    callPredefinedProcedure,
    replyAskMessage
  };
};

export { useChatInteract };
