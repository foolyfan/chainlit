import { useUpload } from 'hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { Alert, Box } from '@mui/material';

import {
  threadHistoryState,
  useChatContext,
  useChatData,
  useChatInteract,
  useChatSession,
  usePassword,
  useScan
} from '@chainlit/react-client';

import { ErrorBoundary } from 'components/atoms/ErrorBoundary';
import SideView from 'components/atoms/element/sideView';
import { Translator } from 'components/i18n';
import { AgreementDrawer } from 'components/molecules/AgreementDrawer';
import { PreviewDrawer } from 'components/molecules/PreviewDrawer';
import ChatProfiles from 'components/molecules/chatProfiles';
import { CommandContainer } from 'components/molecules/command/CommandContainer';
import { TaskList } from 'components/molecules/tasklist/TaskList';

import { apiClientState } from 'state/apiClient';
import { IAttachment, attachmentsState } from 'state/chat';
import { projectSettingsState, sideViewState } from 'state/project';

import Messages from './Messages';
import DropScreen from './dropScreen';
import InputBox from './inputBox';

const Chat = () => {
  const { idToResume } = useChatSession();

  const projectSettings = useRecoilValue(projectSettingsState);
  const setAttachments = useSetRecoilState(attachmentsState);
  const setThreads = useSetRecoilState(threadHistoryState);
  const sideViewElement = useRecoilValue(sideViewState);
  const apiClient = useRecoilValue(apiClientState);

  const [autoScroll, setAutoScroll] = useState(true);
  const { error, disabled, userFutureMessage } = useChatData();
  const { uploadFile } = useChatInteract();
  const uploadFileRef = useRef(uploadFile);

  const fileSpec = useMemo(
    () => ({
      max_size_mb: projectSettings?.features?.multi_modal?.max_size_mb || 500,
      max_files: projectSettings?.features?.multi_modal?.max_files || 20,
      accept: projectSettings?.features?.multi_modal?.accept || ['*/*']
    }),
    [projectSettings]
  );

  const { t } = useTranslation();

  useEffect(() => {
    uploadFileRef.current = uploadFile;
  }, [uploadFile]);

  const onFileUpload = useCallback(
    (payloads: File[]) => {
      const attachements: IAttachment[] = payloads.map((file) => {
        const id = uuidv4();

        const { xhr, promise } = uploadFileRef.current(
          apiClient,
          file,
          (progress) => {
            setAttachments((prev) =>
              prev.map((attachment) => {
                if (attachment.id === id) {
                  return {
                    ...attachment,
                    uploadProgress: progress
                  };
                }
                return attachment;
              })
            );
          }
        );

        promise
          .then((res) => {
            setAttachments((prev) =>
              prev.map((attachment) => {
                if (attachment.id === id) {
                  return {
                    ...attachment,
                    // Update with the server ID
                    serverId: res.id,
                    uploaded: true,
                    uploadProgress: 100,
                    cancel: undefined
                  };
                }
                return attachment;
              })
            );
          })
          .catch((error) => {
            toast.error(
              `${t('components.organisms.chat.index.failedToUpload')} ${
                file.name
              }: ${error.message}`
            );
            setAttachments((prev) =>
              prev.filter((attachment) => attachment.id !== id)
            );
          });

        return {
          id,
          type: file.type,
          name: file.name,
          size: file.size,
          uploadProgress: 0,
          cancel: () => {
            toast.info(
              `${t('components.organisms.chat.index.cancelledUploadOf')} ${
                file.name
              }`
            );
            xhr.abort();
            setAttachments((prev) =>
              prev.filter((attachment) => attachment.id !== id)
            );
          },
          remove: () => {
            setAttachments((prev) =>
              prev.filter((attachment) => attachment.id !== id)
            );
          }
        };
      });
      setAttachments((prev) => prev.concat(attachements));
    },
    [uploadFile]
  );

  const onFileUploadError = useCallback(
    (error: string) => toast.error(error),
    [toast]
  );

  const upload = useUpload({
    spec: fileSpec,
    onResolved: onFileUpload,
    onError: onFileUploadError,
    options: { noClick: true }
  });

  useEffect(() => {
    setThreads((prev) => ({
      ...prev,
      currentThreadId: undefined
    }));
  }, []);

  const enableMultiModalUpload =
    !disabled && projectSettings?.features?.multi_modal?.enabled;

  const { agreement, setAgreement, preview, setPreview, checks, setChecks } =
    useChatContext();
  const onAgreementDrawerClose = useCallback(() => {
    setAgreement(undefined);
  }, []);

  const onPreviewDrawerClose = useCallback(() => {
    setPreview(undefined);
  }, []);

  const onAgreementSubmit = useCallback(() => {
    if (
      userFutureMessage.type == 'reply' &&
      agreement &&
      checks.findIndex((item) => item == agreement.data) < 0
    ) {
      setChecks((old) => [...old, agreement.data]);
    }
  }, [agreement, checks, setChecks]);

  // 切换显示
  // 启动函数
  const { gatherCommand } = useChatData();
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

  return (
    <Box
      {...(enableMultiModalUpload
        ? upload?.getRootProps({ className: 'dropzone' })
        : {})}
      // Disable the onFocus and onBlur events in react-dropzone to avoid interfering with child trigger events
      onBlur={undefined}
      onFocus={undefined}
      display="flex"
      width="100%"
      flexGrow={1}
      position="relative"
    >
      {upload ? (
        <>
          <input id="#upload-drop-input" {...upload.getInputProps()} />
          {upload?.isDragActive ? <DropScreen /> : null}
        </>
      ) : null}
      <SideView>
        <Box my={1} />
        {error ? (
          <Box
            sx={{
              width: '100%',
              maxWidth: '60rem',
              mx: 'auto',
              my: 2
            }}
          >
            <Alert sx={{ mx: 2 }} id="session-error" severity="error">
              <Translator path="components.organisms.chat.index.couldNotReachServer" />
            </Alert>
          </Box>
        ) : null}
        {idToResume ? (
          <Box
            sx={{
              width: '100%',
              maxWidth: '60rem',
              mx: 'auto',
              my: 2
            }}
          >
            <Alert sx={{ mx: 2 }} severity="info">
              <Translator path="components.organisms.chat.index.continuingChat" />
            </Alert>
          </Box>
        ) : null}
        <TaskList isMobile={true} />
        <ErrorBoundary>
          <ChatProfiles />
          {gatherCommand &&
            gatherCommand.spec.type != 'password' &&
            gatherCommand.spec.type != 'scan' && (
              <CommandContainer gatherCommand={gatherCommand} />
            )}

          {(!gatherCommand ||
            gatherCommand.spec.type == 'password' ||
            gatherCommand.spec.type == 'scan') && (
            <>
              <Messages
                autoScroll={autoScroll}
                projectSettings={projectSettings}
                setAutoScroll={setAutoScroll}
              />
              <InputBox
                onFileUpload={onFileUpload}
                onFileUploadError={onFileUploadError}
                autoScroll={autoScroll}
                setAutoScroll={setAutoScroll}
                projectSettings={projectSettings}
              />
            </>
          )}

          {agreement && (
            <AgreementDrawer
              onClose={onAgreementDrawerClose}
              display={agreement.display}
              contentUrl={agreement.src}
              onSubmit={onAgreementSubmit}
            />
          )}
          {preview && (
            <PreviewDrawer
              onClose={onPreviewDrawerClose}
              display={preview.display}
              contentUrl={preview.src}
            />
          )}
        </ErrorBoundary>
      </SideView>
      {sideViewElement ? null : <TaskList isMobile={false} />}
    </Box>
  );
};

export default Chat;
