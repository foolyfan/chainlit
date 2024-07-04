import { cloneDeep, debounce, isEmpty } from 'lodash';
import { useCallback } from 'react';
import {
  useRecoilState,
  useRecoilValue,
  useResetRecoilState,
  useSetRecoilState
} from 'recoil';
import io from 'socket.io-client';
import {
  avatarState,
  callFnState,
  chatProfileState,
  chatSettingsInputsState,
  chatSettingsValueState,
  elementState,
  firstUserInteraction,
  gatherCommandState,
  loadingState,
  messagesState,
  sessionIdState,
  sessionState,
  speechPromptsState,
  tasklistState,
  threadIdToResumeState,
  tokenCountState
} from 'src/state';
import {
  IAvatarElement,
  IElement,
  IMessageElement,
  IStep,
  ITasklistElement,
  IThread
} from 'src/types';
import {
  addMessage,
  deleteMessageById,
  removeWaitingMessage,
  updateMessageById,
  updateMessageContentById
} from 'src/utils/message';

import {
  operableMessagesState,
  preselectionState,
  uiSettingsCommandState,
  userFutureMessageState
} from '.';
import { ChainlitAPI } from './api';
import { type IToken } from './useChatData';

const useChatSession = () => {
  const sessionId = useRecoilValue(sessionIdState);

  const [session, setSession] = useRecoilState(sessionState);

  const resetChatSettingsValue = useResetRecoilState(chatSettingsValueState);
  const setFirstUserInteraction = useSetRecoilState(firstUserInteraction);
  const setLoading = useSetRecoilState(loadingState);
  const setMessages = useSetRecoilState(messagesState);
  const setGatherCommand = useSetRecoilState(gatherCommandState);
  const setCallFn = useSetRecoilState(callFnState);

  const setElements = useSetRecoilState(elementState);
  const setAvatars = useSetRecoilState(avatarState);
  const setTasklists = useSetRecoilState(tasklistState);
  const setChatSettingsInputs = useSetRecoilState(chatSettingsInputsState);
  const setTokenCount = useSetRecoilState(tokenCountState);
  const setUISettings = useSetRecoilState(uiSettingsCommandState);
  const [chatProfile, setChatProfile] = useRecoilState(chatProfileState);
  const idToResume = useRecoilValue(threadIdToResumeState);
  const setSpeechPrompts = useSetRecoilState(speechPromptsState);
  const setPreselection = useSetRecoilState(preselectionState);
  const setUserFutureMessage = useSetRecoilState(userFutureMessageState);
  const setOperableMessages = useSetRecoilState(operableMessagesState);

  const _connect = useCallback(
    ({
      client,
      userEnv,
      accessToken
    }: {
      client: ChainlitAPI;
      userEnv: Record<string, string>;
      accessToken?: string;
    }) => {
      const socket = io(client.httpEndpoint, {
        path: '/ws/socket.io',
        extraHeaders: {
          Authorization: accessToken || '',
          'X-Chainlit-Client-Type': client.type,
          'X-Chainlit-Session-Id': sessionId,
          'X-Chainlit-Thread-Id': idToResume || '',
          'user-env': JSON.stringify(userEnv),
          'X-Chainlit-Chat-Profile': chatProfile || ''
        }
      });
      setSession((old) => {
        old?.socket?.removeAllListeners();
        old?.socket?.close();
        return {
          socket
        };
      });

      socket.on('connect', () => {
        socket.emit('connection_successful');
        setSession((s) => ({ ...s!, error: false }));
      });

      socket.on('connect_error', (_) => {
        setSession((s) => ({ ...s!, error: true }));
      });

      socket.on('task_start', () => {
        console.log('task_start');

        setLoading(true);
      });

      socket.on('task_end', () => {
        console.log('task_end');
        setLoading(false);
      });

      socket.on('reload', () => {
        socket.emit('clear_session');
        window.location.reload();
      });

      socket.on('resume_thread', (thread: IThread) => {
        let messages: IStep[] = [];
        for (const step of thread.steps) {
          messages = addMessage(messages, step);
        }
        if (thread.metadata?.chat_profile) {
          setChatProfile(thread.metadata?.chat_profile);
        }
        setMessages(messages);
        const elements = thread.elements || [];
        setAvatars(
          (elements as IAvatarElement[]).filter((e) => e.type === 'avatar')
        );
        setTasklists(
          (elements as ITasklistElement[]).filter((e) => e.type === 'tasklist')
        );
        setElements(
          (elements as IMessageElement[]).filter(
            (e) => ['avatar', 'tasklist'].indexOf(e.type) === -1
          )
        );
      });

      socket.on('new_message', ({ msg, spec }) => {
        console.log('new_message', msg);
        setMessages((oldMessages) =>
          addMessage(removeWaitingMessage(oldMessages), msg)
        );
        setOperableMessages((oldMessages) => {
          const newMessages = { ...oldMessages };
          newMessages[msg.id] = {
            active: true,
            step: msg,
            attach: {
              ...spec
            }
          };
          return newMessages;
        });
        setUserFutureMessage({ type: 'question' });
        if (!isEmpty(msg.speechContent)) {
          setSpeechPrompts({
            content: msg.speechContent!
          });
        }
      });

      socket.on('first_interaction', (interaction: string) => {
        setFirstUserInteraction(interaction);
      });

      socket.on('update_message', (message: IStep) => {
        console.log('update_message', message);

        setMessages((oldMessages) =>
          updateMessageById(oldMessages, message.id, message)
        );
      });

      socket.on('delete_message', (message: IStep) => {
        console.log('delete_message', message);

        setMessages((oldMessages) =>
          deleteMessageById(oldMessages, message.id)
        );
        if (!isEmpty(message.speechContent)) {
          setSpeechPrompts({
            content: message.speechContent!
          });
        }
      });

      socket.on('stream_start', (message: IStep) => {
        setMessages((oldMessages) => addMessage(oldMessages, message));
      });

      socket.on('stream_token', ({ id, token, isSequence }: IToken) => {
        setMessages((oldMessages) =>
          updateMessageContentById(oldMessages, id, token, isSequence)
        );
      });

      socket.on('ask', ({ msg, spec }, callback) => {
        console.log('ask msg', msg, spec);
        if (!isEmpty(msg.speechContent)) {
          setSpeechPrompts({
            content: msg.speechContent
          });
        }
        setMessages((oldMessages) =>
          addMessage(removeWaitingMessage(oldMessages), msg)
        );
        setOperableMessages((oldMessages) => {
          const newMessages = { ...oldMessages };
          newMessages[msg.id] = {
            active: true,
            step: msg,
            attach: {
              ...spec,
              callback
            }
          };
          return newMessages;
        });
        setUserFutureMessage({ type: 'reply', parent: msg.id });
        setLoading(false);
      });

      socket.on('ask_timeout', ({ msg }) => {
        console.log('ask_timeout', msg);

        setOperableMessages((oldMessages) => {
          const newMessages = cloneDeep(oldMessages);
          newMessages[msg.id].active = false;
          return newMessages;
        });
        setUserFutureMessage({ type: 'question' });
        setLoading(false);
      });

      socket.on('input', ({ msg, spec }, callback) => {
        console.log('input msg', msg, spec);
        if (!isEmpty(msg.speechContent)) {
          setSpeechPrompts({
            content: msg.speechContent
          });
        }
        setMessages((oldMessages) =>
          addMessage(removeWaitingMessage(oldMessages), msg)
        );
        setOperableMessages((oldMessages) => {
          const newMessages = { ...oldMessages };
          newMessages[msg.id] = {
            active: true,
            step: msg,
            attach: {
              ...spec,
              callback
            }
          };
          return newMessages;
        });
        setUserFutureMessage({ type: 'reply', parent: msg.id });
        setLoading(false);
      });

      socket.on('input_timeout', ({ msg }) => {
        console.log('input_timeout');
        setOperableMessages((oldMessages) => {
          const newMessages = cloneDeep(oldMessages);
          newMessages[msg.id].active = false;
          return newMessages;
        });
        setUserFutureMessage({ type: 'question' });
      });
      socket.on('update_input', ({ msg, spec }, callback) => {
        console.log('update_input', msg, spec);
        setMessages((oldMessages) =>
          updateMessageById(removeWaitingMessage(oldMessages), msg.id, msg)
        );
        if (!isEmpty(msg.speechContent)) {
          setSpeechPrompts({
            content: msg.speechContent
          });
        }
        setOperableMessages((oldMessages) => {
          const newMessages = { ...oldMessages };
          newMessages[msg.id] = {
            active: true,
            step: msg,
            attach: {
              ...spec,
              callback
            }
          };
          return newMessages;
        });
        setUserFutureMessage({ type: 'reply', parent: msg.id });
        setLoading(false);
      });

      socket.on('clear_input', ({ msg }) => {
        console.log('clear_input', msg);
        setOperableMessages((oldMessages) => {
          const newMessages = cloneDeep(oldMessages);
          newMessages[msg.id].active = false;
          return newMessages;
        });
        setUserFutureMessage({ type: 'question' });
      });

      socket.on('gather_command_timeout', () => {
        setGatherCommand(undefined);
      });

      socket.on('gather_command', ({ msg, spec }, callback) => {
        console.log('gather_command', msg, spec, callback);
        setMessages((oldMessages) => removeWaitingMessage(oldMessages));
        setGatherCommand({ spec, callback });
        if (!isEmpty(msg.speechContent)) {
          setSpeechPrompts({
            content: msg.speechContent
          });
        }
      });

      socket.on('clear_gather_command', () => {
        console.log('clear_gather_command');
        setGatherCommand(undefined);
      });

      socket.on('call_fn', ({ name, args }, callback) => {
        const event = new CustomEvent('chainlit-call-fn', {
          detail: {
            name,
            args,
            callback
          }
        });
        window.dispatchEvent(event);

        setCallFn({ name, args, callback });
      });

      socket.on('clear_call_fn', () => {
        setCallFn(undefined);
      });

      socket.on('call_fn_timeout', () => {
        setCallFn(undefined);
      });

      socket.on('chat_settings', (inputs: any) => {
        setChatSettingsInputs(inputs);
        resetChatSettingsValue();
      });

      socket.on('element', (element: IElement) => {
        console.log('message element', element);

        if (!element.url && element.chainlitKey) {
          element.url = client.getElementUrl(element.chainlitKey, sessionId);
        }

        if (element.type === 'avatar') {
          setAvatars((old) => {
            const index = old.findIndex((e) => e.id === element.id);
            if (index === -1) {
              return [...old, element];
            } else {
              return [...old.slice(0, index), element, ...old.slice(index + 1)];
            }
          });
        } else if (element.type === 'tasklist') {
          setTasklists((old) => {
            const index = old.findIndex((e) => e.id === element.id);
            if (index === -1) {
              return [...old, element];
            } else {
              return [...old.slice(0, index), element, ...old.slice(index + 1)];
            }
          });
        } else {
          setElements((old) => {
            const index = old.findIndex((e) => e.id === element.id);
            if (index === -1) {
              return [...old, element];
            } else {
              return [...old.slice(0, index), element, ...old.slice(index + 1)];
            }
          });
        }
      });

      socket.on('remove_element', (remove: { id: string }) => {
        console.log('remove_element', remove);

        setElements((old) => {
          return old.filter((e) => e.id !== remove.id);
        });
        setTasklists((old) => {
          return old.filter((e) => e.id !== remove.id);
        });
        setAvatars((old) => {
          return old.filter((e) => e.id !== remove.id);
        });
      });

      socket.on('token_usage', (count: number) => {
        setTokenCount((old) => old + count);
      });

      socket.on('change_theme', ({ spec }) => {
        console.log('change_theme');
        setUISettings({ spec });
      });

      socket.on('advise', ({ msg, spec }) => {
        console.log('advise', spec);
        if (spec.type == 'input') {
          setPreselection(spec);
        }
        if (spec.type == 'message') {
          setMessages((oldMessages) =>
            addMessage(removeWaitingMessage(oldMessages), msg)
          );
          setOperableMessages((oldMessages) => {
            const newMessages = { ...oldMessages };
            newMessages[msg.id] = {
              active: true,
              step: msg,
              attach: {
                ...spec
              }
            };
            return newMessages;
          });
          setUserFutureMessage({ type: 'question' });
        }
        if (!isEmpty(msg.speechContent)) {
          setSpeechPrompts({
            content: msg.speechContent
          });
        }
      });

      socket.on('clear_input_advise', () => {
        console.log('clear_prompt_advise');
        setPreselection(undefined);
      });
    },
    [setSession, sessionId, chatProfile]
  );

  const connect = useCallback(debounce(_connect, 200), [_connect]);

  const disconnect = useCallback(() => {
    if (session?.socket) {
      session.socket.removeAllListeners();
      session.socket.close();
    }
  }, [session]);

  return {
    connect,
    disconnect,
    session,
    sessionId,
    chatProfile,
    idToResume,
    setChatProfile
  };
};

export { useChatSession };
