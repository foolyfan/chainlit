import { useAuth } from 'api/auth';
import { memo, useCallback } from 'react';
import { useSetRecoilState } from 'recoil';
import { v4 as uuidv4 } from 'uuid';

import { Box } from '@mui/material';

import {
  IProjectSettings,
  IStep,
  UserInputType,
  useChatData,
  useChatInteract
} from '@chainlit/react-client';

import ScrollDownButton from 'components/atoms/buttons/scrollDownButton';

import { inputHistoryState } from 'state/userInputHistory';

import Input from './input';

interface Props {
  onFileUpload: (payload: File[]) => void;
  onFileUploadError: (error: string) => void;
  setAutoScroll: (autoScroll: boolean) => void;
  autoScroll?: boolean;
  projectSettings?: IProjectSettings;
}

const InputBox = memo(
  ({
    onFileUpload,
    onFileUploadError,
    setAutoScroll,
    autoScroll,
    projectSettings
  }: Props) => {
    const setInputHistory = useSetRecoilState(inputHistoryState);

    const { user } = useAuth();
    const { sendMessage, replyAskMessage, addWaitingMessage } =
      useChatInteract();
    const createUserMessage = useCallback((output: string): IStep => {
      return {
        threadId: '',
        id: uuidv4(),
        name: user?.identifier || 'User',
        type: 'user_message',
        output,
        createdAt: new Date().toISOString()
      };
    }, []);

    const onSubmit = useCallback(
      async (msg: string) => {
        setInputHistory((old) => {
          const MAX_SIZE = 50;
          const inputs = [...(old.inputs || [])];
          inputs.push({
            content: msg,
            createdAt: new Date().getTime()
          });

          return {
            ...old,
            inputs:
              inputs.length > MAX_SIZE
                ? inputs.slice(inputs.length - MAX_SIZE)
                : inputs
          };
        });

        setAutoScroll(true);
        sendMessage(createUserMessage(msg));
        addWaitingMessage(projectSettings!.ui.name);
      },
      [user, projectSettings, sendMessage]
    );

    const { userFutureMessage } = useChatData();

    const onReply = useCallback(
      async (msg: string, inputType: UserInputType, data?: any) => {
        if (userFutureMessage.type != 'reply') {
          return;
        }

        replyAskMessage(
          userFutureMessage.parent!,
          createUserMessage(msg),
          inputType,
          data
        );
        addWaitingMessage(projectSettings!.ui.name);
        setAutoScroll(true);
      },
      [user, replyAskMessage, userFutureMessage]
    );

    return (
      <Box
        display="flex"
        position="relative"
        flexDirection="column"
        gap={1}
        p={1}
        sx={{
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: '60rem',
          m: 'auto',
          justifyContent: 'center',
          borderTop: (theme) =>
            theme.palette.mode == 'dark'
              ? '1px solid #424242'
              : '1px solid #E0E0E0'
        }}
      >
        {!autoScroll ? (
          <ScrollDownButton onClick={() => setAutoScroll(true)} />
        ) : null}

        <Box>
          <Input
            onFileUpload={onFileUpload}
            onFileUploadError={onFileUploadError}
            onSubmit={onSubmit}
            onReply={onReply}
          />
          {/* {tokenCount > 0 && ( */}
          {/* <Stack flexDirection="row" alignItems="center">
          <Typography
            sx={{ ml: 'auto' }}
            color="text.secondary"
            variant="caption"
          >
            Token usage: {tokenCount}
          </Typography>
        </Stack> */}
          {/* )} */}
        </Box>
        {/* <WaterMark /> */}
      </Box>
    );
  }
);

export default InputBox;
