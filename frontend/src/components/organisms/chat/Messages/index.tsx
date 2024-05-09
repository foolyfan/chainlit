import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { toast } from 'sonner';

import {
  IAction,
  IChoiceAction,
  IFeedback,
  IStep,
  accessTokenState,
  messagesState,
  updateMessageById,
  useChatData,
  useChatInteract,
  useChatMessages,
  useChatSession
} from '@chainlit/react-client';

import { CommandContainer } from 'components/molecules/command/CommandContainer';

import { apiClientState } from 'state/apiClient';
import { IProjectSettings } from 'state/project';

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
  const { elements, askUser, avatars, loading, actions, choiceActions } =
    useChatData();

  const { messages } = useChatMessages();
  const { callAction, callChoiceAction } = useChatInteract();
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

  const callChoiceActionWithToast = useCallback(
    (action: IChoiceAction) => {
      const promise = callChoiceAction(action);
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
    [callChoiceAction]
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

  return !idToResume &&
    !messages.length &&
    projectSettings?.ui.show_readme_as_default ? (
    <WelcomeScreen
      variant="app"
      markdown={projectSettings?.markdown}
      allowHtml={projectSettings?.features?.unsafe_allow_html}
      latex={projectSettings?.features?.latex}
    />
  ) : gatherCommand ? (
    <CommandContainer gatherCommand={gatherCommand} />
  ) : (
    <MessageContainer
      avatars={avatars}
      loading={loading}
      askUser={askUser}
      actions={actions}
      choiceActions={choiceActions}
      elements={elements}
      messages={messages}
      autoScroll={autoScroll}
      onFeedbackUpdated={onFeedbackUpdated}
      callAction={callActionWithToast}
      callChoiceAction={callChoiceActionWithToast}
      setAutoScroll={setAutoScroll}
    />
  );
};

export default Messages;
