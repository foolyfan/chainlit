import { memo, useCallback, useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import 'regenerator-runtime';

import KeyboardIcon from '@mui/icons-material/Keyboard';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import { Box, Chip, IconButton, Stack } from '@mui/material';

import {
  InputSpec,
  PSPromptItem,
  UserInputType,
  useChatContext,
  useChatData
} from '@chainlit/react-client';

import { Attachments } from 'components/molecules/attachments';

import { attachmentsState } from 'state/chat';
import { projectSettingsState } from 'state/project';

import { DefaultInputField } from './DefaultInputField';
import { NumberInputField } from './NumberInputField';
import { TextInputField } from './TextInputField';
import SpeechButton from './speechButton';

interface Props {
  onFileUpload: (payload: File[]) => void;
  onFileUploadError: (error: string) => void;
  onSubmit: (message: string) => void;
  onReply: (msg: string, inputType: UserInputType, data?: any) => void;
}

// function getLineCount(el: HTMLDivElement) {
//   const textarea = el.querySelector('textarea');
//   if (!textarea) {
//     return 0;
//   }
//   const lines = textarea.value.split('\n');
//   return lines.length;
// }

const Input = memo(({ onSubmit, onReply }: Props) => {
  const [attachments, setAttachments] = useRecoilState(attachmentsState);
  const [pSettings] = useRecoilState(projectSettingsState);
  // const setInputHistory = useSetRecoilState(inputHistoryState);

  const { abortAudioTask } = useChatContext();
  const {
    disabled: _disabled,
    gatherCommand,
    loading,
    userFutureMessage,
    operableMessages,
    preselection
  } = useChatData();

  const disabled = _disabled || !!attachments.find((a) => !a.uploaded);

  const [value, setValue] = useState('');

  const showSpeechToText = pSettings?.features.speech_to_text?.enabled;

  // 用户输入模式，切换输入框和录入语音按钮
  const [inputState, setInputState] = useState<UserInputType>('keyboard');

  // 语音输入标志
  const [speech, setSpeechInput] = useState<boolean>(false);

  const [speechRecognitionRuning, setSpeechRecognitionRuning] =
    useState<boolean>(false);

  // useEffect(() => {
  //   const pasteEvent = (event: ClipboardEvent) => {
  //     if (event.clipboardData && event.clipboardData.items) {
  //       const items = Array.from(event.clipboardData.items);
  //       items.forEach((item) => {
  //         if (item.kind === 'file') {
  //           const file = item.getAsFile();
  //           if (file) {
  //             onFileUpload([file]);
  //           }
  //         }
  //       });
  //     }
  //   };

  //   if (!ref.current) {
  //     return;
  //   }

  //   const input = ref.current;

  //   input.addEventListener('paste', pasteEvent);

  //   return () => {
  //     input.removeEventListener('paste', pasteEvent);
  //   };
  // }, []);

  const clearInput = useCallback(() => {
    setSpeechInput(false);
    setValue('');
  }, []);

  const submit = useCallback(() => {
    if (value === '' || disabled) {
      return;
    }
    if (userFutureMessage.type == 'reply') {
      onReply(value, speech ? 'speech' : 'keyboard');
    } else {
      onSubmit(value);
    }
    setAttachments([]);
    clearInput();
  }, [
    value,
    disabled,
    setValue,
    attachments,
    setAttachments,
    onSubmit,
    gatherCommand,
    speech,
    onReply,
    clearInput
  ]);

  useEffect(() => {
    if (value != '' && inputState == 'speech') {
      submit();
    }
  }, [value]);

  // const handleKeyDown = useCallback(
  //   (e: React.KeyboardEvent) => {
  //     if (e.key === 'ArrowUp') {
  //       const lineCount = getLineCount(e.currentTarget as HTMLDivElement);
  //       if (lineCount <= 1) {
  //         setInputHistory((old) => ({ ...old, open: true }));
  //       }
  //     }
  //   },
  //   [submit, setInputHistory]
  // );

  // const onHistoryClick = useCallback((content: string) => {
  //   if (ref.current) {
  //     setValue(content);
  //   }
  // }, []);

  // const startAdornment = (
  //   <>
  //     {/* <HistoryButton
  //         disabled={disabled && !loading}
  //         onClick={onHistoryClick}
  //       />
  //       <UploadButton
  //         disabled={disabled && !loading}
  //         fileSpec={fileSpec}
  //         onFileUploadError={onFileUploadError}
  //         onFileUpload={onFileUpload}
  //       /> */}
  //     {chatSettingsInputs.length > 0 && (
  //       <IconButton
  //         id="chat-settings-open-modal"
  //         disabled={disabled}
  //         color="inherit"
  //         onClick={() => setChatSettingsOpen(true)}
  //       >
  //         <TuneIcon />
  //       </IconButton>
  //     )}
  //   </>
  // );

  const handleClick = useCallback((label: string) => {
    setValue(label);
  }, []);

  const [input, setInput] = useState<InputSpec>();
  useEffect(() => {
    if (userFutureMessage.type == 'question') {
      setInput(undefined);
    }
    if (
      userFutureMessage.type == 'reply' &&
      operableMessages[userFutureMessage.parent!].active &&
      operableMessages[userFutureMessage.parent!].attach?.__type__ ==
        'InputSpec'
    ) {
      const inputSpec = operableMessages[userFutureMessage.parent!]
        .attach as InputSpec;
      setInput(inputSpec);
    }
  }, [userFutureMessage, operableMessages]);

  return (
    <>
      {preselection && preselection.type == 'prompt' ? (
        <Stack
          direction="row"
          spacing={1}
          rowGap={1}
          flexWrap="wrap"
          marginBottom={1}
        >
          {preselection.items.map((item) => (
            <Chip
              size="small"
              label={(item as PSPromptItem).label}
              color="primary"
              variant="outlined"
              onClick={() => handleClick((item as PSPromptItem).label)}
              sx={{
                backgroundColor: (theme) => theme.palette.background.paper,
                borderRadius: '0.25rem'
              }}
            />
          ))}
        </Stack>
      ) : null}
      <Box sx={{ display: 'flex', flexDirection: 'row' }}>
        {
          <IconButton
            sx={{ width: '50px', color: 'text.secondary' }}
            disableRipple
            onClick={() => {
              if (showSpeechToText) {
                inputState == 'speech'
                  ? setInputState('keyboard')
                  : setInputState('speech');
              }
            }}
            disabled={speechRecognitionRuning}
          >
            {inputState == 'speech' ? <KeyboardIcon /> : <KeyboardVoiceIcon />}
          </IconButton>
        }
        <Stack
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: 1,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: 'box-shadow: 0px 2px 4px 0px #0000000D',
            textarea: {
              height: '34px',
              maxHeight: '30vh',
              overflowY: 'auto !important',
              resize: 'none',
              color: 'text.primary',
              lineHeight: '24px'
            },
            width: '100%'
          }}
        >
          {attachments.length > 0 ? (
            <Box
              sx={{
                mt: 2,
                mx: 2,
                padding: '2px'
              }}
            >
              <Attachments />
            </Box>
          ) : null}
          {inputState == 'speech' ? (
            <SpeechButton
              onSpeech={(text) => {
                setSpeechInput(true);
                setValue(text);
              }}
              onSpeechRecognitionRuning={(state) => {
                setSpeechRecognitionRuning(state);
              }}
            />
          ) : (
            <>
              {input ? (
                <>
                  {input.type == 'text' && (
                    <TextInputField
                      value={value}
                      onChange={(value) => setValue(value)}
                      onSubmit={submit}
                      onFocus={abortAudioTask}
                      disabled={disabled && !loading}
                      placeholder={input.placeholder}
                      rules={input.rules}
                    />
                  )}
                  {input.type == 'number' && (
                    <NumberInputField
                      value={value}
                      onChange={(value) => setValue(value)}
                      onSubmit={submit}
                      onFocus={abortAudioTask}
                      disabled={disabled && !loading}
                      placeholder={input.placeholder}
                      rules={input.rules}
                    />
                  )}
                </>
              ) : (
                <DefaultInputField
                  value={value}
                  onSubmit={submit}
                  disabled={disabled && !loading}
                  onChange={(value) => setValue(value)}
                  onFocus={abortAudioTask}
                />
              )}
            </>
          )}
        </Stack>
      </Box>
    </>
  );
});
Input.displayName = 'Input';
export default Input;
