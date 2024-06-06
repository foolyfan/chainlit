import { useAuth } from 'api/auth';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import {
  IAction,
  IFeedback,
  IGatherCommandResponse,
  IListAction,
  IProjectSettings,
  IStep,
  accessTokenState,
  messagesState,
  updateMessageById,
  useChatData,
  useChatInteract,
  useChatMessages,
  useChatSession,
  usePassword
} from '@chainlit/react-client';

import { CommandContainer } from 'components/molecules/command/CommandContainer';

import { apiClientState } from 'state/apiClient';

import MessageContainer from './container';
import WelcomeScreen from './welcomeScreen';

interface MessagesProps {
  autoScroll: boolean;
  projectSettings?: IProjectSettings;
  setAutoScroll: (autoScroll: boolean) => void;
}

const Messages = ({
  autoScroll,
  projectSettings,
  setAutoScroll
}: MessagesProps): JSX.Element => {
  const { elements, askUser, avatars, loading, actions, listActions } =
    useChatData();

  const { messages } = useChatMessages();
  const { callAction, callListAction } = useChatInteract();
  const { idToResume } = useChatSession();
  const accessToken = useRecoilValue(accessTokenState);
  const setMessages = useSetRecoilState(messagesState);
  const apiClient = useRecoilValue(apiClientState);
  const { gatherCommand } = useChatData();

  const { t } = useTranslation();

  const callActionWithToast = useCallback(
    (action: IAction) => {
      const promise = callAction(action);
      if (promise) {
        toast.promise(promise, {
          loading: `${t('components.organisms.chat.Messages.index.running')} ${
            action.name
          }`,
          success: (res) => {
            if (res.response) {
              return res.response;
            } else {
              return `${action.name} ${t(
                'components.organisms.chat.Messages.index.executedSuccessfully'
              )}`;
            }
          },
          error: (res) => {
            if (res.response) {
              return res.response;
            } else {
              return `${action.name} ${t(
                'components.organisms.chat.Messages.index.failed'
              )}`;
            }
          }
        });
      }
    },
    [callAction]
  );

  const callListActionWithToast = useCallback(
    (action: IListAction) => {
      const promise = callListAction(action);
      if (promise) {
        toast.promise(promise, {
          loading: `${t('components.organisms.chat.Messages.index.running')}`,
          success: (res) => {
            if (res.response) {
              return res.response;
            } else {
              return `${t(
                'components.organisms.chat.Messages.index.executedSuccessfully'
              )}`;
            }
          },
          error: (res) => {
            if (res.response) {
              return res.response;
            } else {
              return `${t('components.organisms.chat.Messages.index.failed')}`;
            }
          }
        });
      }
    },
    [callListAction]
  );

  const onFeedbackUpdated = useCallback(
    async (message: IStep, onSuccess: () => void, feedback: IFeedback) => {
      try {
        toast.promise(apiClient.setFeedback(feedback, accessToken), {
          loading: t('components.organisms.chat.Messages.index.updating'),
          success: (res) => {
            setMessages((prev) =>
              updateMessageById(prev, message.id, {
                ...message,
                feedback: {
                  ...feedback,
                  id: res.feedbackId
                }
              })
            );
            onSuccess();
            return t(
              'components.organisms.chat.Messages.index.feedbackUpdated'
            );
          },
          error: (err) => {
            return <span>{err.message}</span>;
          }
        });
      } catch (err) {
        console.log(err);
      }
    },
    []
  );

  const { invokeKeyboard, text, status } = usePassword('请输入密码', false);
  const { user } = useAuth();
  const { replyMessage, addWaitingMessage } = useChatInteract();
  const onReply = useCallback(
    async (msg: string, cmdRes?: IGatherCommandResponse) => {
      const message: IStep = {
        threadId: '',
        id: uuidv4(),
        name: user?.identifier || 'User',
        type: 'user_message',
        output: msg,
        createdAt: new Date().toISOString()
      };

      replyMessage(message, cmdRes);
      addWaitingMessage(projectSettings!.ui.name);
      setAutoScroll(true);
    },
    [user, replyMessage]
  );

  useEffect(() => {
    if (gatherCommand?.spec.type == 'password') {
      invokeKeyboard();
    }
  }, [gatherCommand]);

  useEffect(() => {
    if (!gatherCommand) {
      return;
    }
    if (status == 'finish') {
      console.log('密码输入完成', text);
      onReply('', {
        ...gatherCommand!.spec,
        code: '00',
        msg: '',
        data: { value: text }
      });
    }
    if (status == 'cancel') {
      console.log('取消输入密码');
      onReply('', {
        ...gatherCommand!.spec,
        code: '01',
        msg: '客户取消输入',
        data: {}
      });
    }
  }, [status, text]);

  return !idToResume &&
    !messages.length &&
    projectSettings?.ui.show_readme_as_default ? (
    <WelcomeScreen
      variant="app"
      markdown={projectSettings?.markdown}
      allowHtml={projectSettings?.features?.unsafe_allow_html}
      latex={projectSettings?.features?.latex}
    />
  ) : (
    <>
      {gatherCommand && gatherCommand.spec.type !== 'password' && (
        <CommandContainer gatherCommand={gatherCommand} />
      )}
      <MessageContainer
        avatars={avatars}
        loading={loading}
        askUser={askUser}
        actions={actions}
        listActions={listActions}
        elements={elements}
        messages={messages}
        autoScroll={autoScroll}
        onFeedbackUpdated={onFeedbackUpdated}
        callAction={callActionWithToast}
        callListAction={callListActionWithToast}
        setAutoScroll={setAutoScroll}
        hidden={Boolean(
          gatherCommand && gatherCommand.spec.type !== 'password'
        )}
      />
    </>
  );
};

export default Messages;
