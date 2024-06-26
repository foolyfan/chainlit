import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { toast } from 'sonner';

import {
  IFeedback,
  IProjectSettings,
  IStep,
  accessTokenState,
  messagesState,
  updateMessageById,
  useChatData,
  useChatInteract,
  useChatMessages,
  useChatSession,
  usePassword,
  useScan
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
  const { elements, avatars, loading } = useChatData();

  const { messages } = useChatMessages();
  const { idToResume } = useChatSession();
  const accessToken = useRecoilValue(accessTokenState);
  const setMessages = useSetRecoilState(messagesState);
  const apiClient = useRecoilValue(apiClientState);
  const { gatherCommand } = useChatData();

  const { t } = useTranslation();

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

  // 启动函数
  useEffect(() => {
    if (gatherCommand?.spec.type == 'password') {
      invokeKeyboard();
    }
    if (gatherCommand?.spec.type == 'scan') {
      takePhoto();
    }
  }, [gatherCommand]);

  // 输入密码
  const {
    invokeKeyboard,
    text,
    status: passwordStatus
  } = usePassword('请输入密码', false);

  const { replyCmdMessage } = useChatInteract();

  useEffect(() => {
    if (!gatherCommand || gatherCommand.spec.type != 'password') {
      return;
    }
    if (passwordStatus == 'finish') {
      replyCmdMessage({
        ...gatherCommand!.spec,
        code: '00',
        msg: '',
        data: { value: text }
      });
    }
    if (passwordStatus == 'cancel') {
      replyCmdMessage({
        ...gatherCommand!.spec,
        code: '01',
        msg: '客户取消输入',
        data: {}
      });
    }
  }, [passwordStatus, text]);

  // 扫一扫
  const { sessionId } = useChatSession();
  const { imageFile, clearImage, takePhoto, status: scanStatus } = useScan();

  useEffect(() => {
    if (!gatherCommand || gatherCommand.spec.type != 'scan') {
      return;
    }
    if (gatherCommand && scanStatus == 'finish' && imageFile) {
      const { promise } = apiClient.uploadFile(
        imageFile as File,
        () => {},
        sessionId
      );
      promise
        .then((res) => {
          replyCmdMessage({
            ...gatherCommand!.spec,
            code: '00',
            msg: '客户扫描成功',
            data: {
              value: res.id
            }
          });
        })
        .catch((error) => {
          console.error(error);

          toast.error(error.toString());
        })
        .finally(() => {
          clearImage();
        });

      clearImage();
    }
    if (scanStatus == 'cancel') {
      replyCmdMessage({
        ...gatherCommand!.spec,
        code: '01',
        msg: '客户取消扫描',
        data: {}
      });
    }
  }, [scanStatus, imageFile]);

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
      {gatherCommand &&
        gatherCommand.spec.type !== 'password' &&
        gatherCommand.spec.type !== 'scan' && (
          <CommandContainer gatherCommand={gatherCommand} />
        )}
      <MessageContainer
        avatars={avatars}
        loading={loading}
        elements={elements}
        messages={messages}
        autoScroll={autoScroll}
        onFeedbackUpdated={onFeedbackUpdated}
        setAutoScroll={setAutoScroll}
        hidden={Boolean(
          gatherCommand &&
            gatherCommand.spec.type !== 'password' &&
            gatherCommand.spec.type !== 'scan'
        )}
      />
    </>
  );
};

export default Messages;
