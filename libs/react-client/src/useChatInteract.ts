import { useCallback } from 'react';
import { useRecoilValue, useResetRecoilState, useSetRecoilState } from 'recoil';
import {
  accessTokenState,
  actionState,
  askUserState,
  avatarState,
  chatSettingsInputsState,
  chatSettingsValueState,
  elementState,
  firstUserInteraction,
  gatherCommandState,
  loadingState,
  messagesState,
  sessionIdState,
  sessionState,
  tasklistState,
  threadIdToResumeState,
  tokenCountState
} from 'src/state';
import {
  IAction,
  IAskResponse,
  IChoiceAction,
  IFileRef,
  IStep
} from 'src/types';
import { addMessage } from 'src/utils/message';

import { ChainlitAPI } from './api';

const useChatInteract = () => {
  const accessToken = useRecoilValue(accessTokenState);
  const session = useRecoilValue(sessionState);
  const askUser = useRecoilValue(askUserState);
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
  const setActions = useSetRecoilState(actionState);
  const setTokenCount = useSetRecoilState(tokenCountState);
  const setIdToResume = useSetRecoilState(threadIdToResumeState);

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
    setActions([]);
    setTokenCount(0);
    resetChatSettings();
    resetChatSettingsValue();
  }, [session]);

  const sendMessage = useCallback(
    (message: IStep, fileReferences?: IFileRef[]) => {
      setMessages((oldMessages) => addMessage(oldMessages, message));
      console.log('emit ui_message', message);
      session?.socket.emit('ui_message', { message, fileReferences });
    },
    [session?.socket]
  );

  const replyMessage = useCallback(
    (message: IStep) => {
      if (askUser) {
        setMessages((oldMessages) => addMessage(oldMessages, message));
        let responseMessage: IAskResponse | undefined = undefined;
        if (
          askUser.spec.type == 'choice_action' ||
          askUser.spec.type == 'action'
        ) {
          responseMessage = {
            id: message.id,
            type: 'text',
            forId: '',
            value: message.output
          };
        }
        console.log('reply message', responseMessage || message);
        askUser.callback(responseMessage || message);
      }
      if (gatherCommand) {
        gatherCommand.callback(gatherCommand.spec);
      }
    },
    [askUser, gatherCommand]
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

      const promise = new Promise<{
        id: string;
        status: boolean;
        response?: string;
      }>((resolve, reject) => {
        socket.once('action_response', (response) => {
          if (response.status) {
            resolve(response);
          } else {
            reject(response);
          }
        });
      });

      socket.emit('action_call', action);

      return promise;
    },
    [session?.socket]
  );

  const callChoiceAction = useCallback(
    (action: IChoiceAction) => {
      const socket = session?.socket;
      if (!socket) return;

      const promise = new Promise<{
        id: string;
        status: boolean;
        response?: string;
      }>((resolve, reject) => {
        socket.once('choice_action_response', (response) => {
          if (response.status) {
            resolve(response);
          } else {
            reject(response);
          }
        });
      });

      socket.emit('choice_action_call', action);

      return promise;
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

  return {
    uploadFile,
    callAction,
    callChoiceAction,
    clear,
    replyMessage,
    sendMessage,
    stopTask,
    setIdToResume,
    updateChatSettings
  };
};

export { useChatInteract };
