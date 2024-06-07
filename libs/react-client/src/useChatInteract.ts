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
  inputState,
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
  IFileRef,
  IGatherCommandResponse,
  IListAction,
  IStep
} from 'src/types';
import { addMessage } from 'src/utils/message';

import { ChainlitAPI } from './api';
import { useChatContext } from './chatContext';

const useChatInteract = () => {
  const accessToken = useRecoilValue(accessTokenState);
  const session = useRecoilValue(sessionState);
  const askUser = useRecoilValue(askUserState);
  const gatherCommand = useRecoilValue(gatherCommandState);
  const sessionId = useRecoilValue(sessionIdState);
  const input = useRecoilValue(inputState);

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

  const { abortAudioTask, actionRef } = useChatContext();

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
      abortAudioTask();

      setMessages((oldMessages) => addMessage(oldMessages, message));
      console.log('emit ui_message', message);
      session?.socket.emit('ui_message', { message, fileReferences });
    },
    [session?.socket, abortAudioTask]
  );

  const replyMessage = useCallback(
    (
      message: IStep,
      spec?: {
        asr?: boolean;
        cmdRes?: IGatherCommandResponse;
        action?: IAction | IListAction;
      }
    ) => {
      abortAudioTask();
      if (askUser) {
        setMessages((oldMessages) => addMessage(oldMessages, message));
        let responseMessage: IAskResponse | undefined = undefined;
        if (
          askUser.spec.type == 'list_action' ||
          askUser.spec.type == 'action'
        ) {
          responseMessage = spec?.action
            ? {
                id: spec?.action.id,
                forId: spec?.action.forId,
                value: spec?.action.id,
                type: 'click'
              }
            : {
                id: message.id,
                type: 'text',
                forId: '',
                value: message.output
              };
        }
        console.log('reply askUser message', responseMessage || message);
        askUser.callback(responseMessage || message);

        if (actionRef) {
          actionRef.current.toHistory();
        }
      }
      if (input) {
        console.log('reply input message', message);
        console.log('reply input message', spec);
        setMessages((oldMessages) => addMessage(oldMessages, message));

        input.callback(
          spec?.action
            ? {
                id: message.id,
                type: 'click',
                forId: spec.action.id,
                value: spec?.action.id
              }
            : {
                id: message.id,
                type: spec?.asr ? 'asr_res' : 'input',
                forId: '',
                value: message.output
              }
        );
      }
      if (gatherCommand && spec?.cmdRes) {
        console.log('reply gatherCommand message', spec);
        gatherCommand.callback(spec?.cmdRes);
      }
    },
    [askUser, gatherCommand, abortAudioTask]
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

  const callListAction = useCallback(
    (action: IListAction) => {
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
    callListAction,
    clear,
    sendMessage,
    replyMessage,
    stopTask,
    setIdToResume,
    updateChatSettings,
    addWaitingMessage
  };
};

export { useChatInteract };
