import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import 'regenerator-runtime';

import KeyboardIcon from '@mui/icons-material/Keyboard';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import { Box, IconButton, Stack } from '@mui/material';

import {
  FileSpec,
  IGatherCommandResponse,
  useChatContext,
  useChatData
} from '@chainlit/react-client';

import { Attachments } from 'components/molecules/attachments';

import { IAttachment, attachmentsState } from 'state/chat';
import { projectSettingsState } from 'state/project';
import { inputHistoryState } from 'state/userInputHistory';

import { DefaultInputField } from './DefaultInputField';
import { NumberInputField } from './NumberInputField';
import { TextInputField } from './TextInputField';
import SpeechButton from './speechButton';

interface Props {
  fileSpec: FileSpec;
  onFileUpload: (payload: File[]) => void;
  onFileUploadError: (error: string) => void;
  onSubmit: (message: string, attachments?: IAttachment[]) => void;
  onReply: (
    message: string,
    spec?: { asr?: boolean; cmdRes?: IGatherCommandResponse }
  ) => void;
}

function getLineCount(el: HTMLDivElement) {
  const textarea = el.querySelector('textarea');
  if (!textarea) {
    return 0;
  }
  const lines = textarea.value.split('\n');
  return lines.length;
}

const Input = memo(({ onFileUpload, onSubmit, onReply }: Props) => {
  const [attachments, setAttachments] = useRecoilState(attachmentsState);
  const [pSettings] = useRecoilState(projectSettingsState);
  const setInputHistory = useSetRecoilState(inputHistoryState);

  const { abortAudioTask } = useChatContext();

  const ref = useRef<HTMLDivElement>(null);
  const {
    askUser,
    disabled: _disabled,
    gatherCommand,
    loading,
    input
  } = useChatData();

  const disabled = _disabled || !!attachments.find((a) => !a.uploaded);

  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const showSpeechToText = pSettings?.features.speech_to_text?.enabled;

  const [inputState, setInputState] = useState<'speech' | 'keyboard'>(
    'keyboard'
  );

  const [asrInput, setAsrInput] = useState<boolean>(false);

  const [speechRecognitionRuning, setSpeechRecognitionRuning] =
    useState<boolean>(false);

  useEffect(() => {
    const pasteEvent = (event: ClipboardEvent) => {
      if (event.clipboardData && event.clipboardData.items) {
        const items = Array.from(event.clipboardData.items);
        items.forEach((item) => {
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
              onFileUpload([file]);
            }
          }
        });
      }
    };

    if (!ref.current) {
      return;
    }

    const input = ref.current;

    input.addEventListener('paste', pasteEvent);

    return () => {
      input.removeEventListener('paste', pasteEvent);
    };
  }, []);

  const clearInput = useCallback(() => {
    setAsrInput(false);
    setValue('');
  }, [setAsrInput, setValue]);

  const submit = useCallback(() => {
    if (value === '' || disabled) {
      return;
    }
    if (input) {
      onReply(value, {
        asr: asrInput
      });
      clearInput();
      return;
    }
    if (askUser) {
      onReply(value);
    } else {
      onSubmit(value, attachments);
    }
    setAttachments([]);
    clearInput();
  }, [
    value,
    disabled,
    setValue,
    askUser,
    attachments,
    setAttachments,
    onSubmit,
    gatherCommand,
    asrInput,
    onReply,
    clearInput
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (!isComposing) {
          e.preventDefault();
          submit();
        }
      } else if (e.key === 'ArrowUp') {
        const lineCount = getLineCount(e.currentTarget as HTMLDivElement);
        if (lineCount <= 1) {
          setInputHistory((old) => ({ ...old, open: true }));
        }
      }
    },
    [submit, setInputHistory, isComposing]
  );

  // const onHistoryClick = useCallback((content: string) => {
  //   if (ref.current) {
  //     setValue(content);
  //   }
  // }, []);

  useEffect(() => {
    if (value != '' && inputState == 'speech') {
      submit();
    }
  }, [value]);

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

  return (
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
              setAsrInput(true);
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
                {input.spec.type == 'text' && (
                  <TextInputField
                    ref={ref}
                    value={value}
                    onChange={(value) => setValue(value)}
                    onSubmit={submit}
                    onCompositionEnd={() => setIsComposing(false)}
                    onCompositionStart={() => setIsComposing(true)}
                    onFocus={abortAudioTask}
                    onKeyDown={handleKeyDown}
                    disabled={disabled && !loading}
                    placeholder={input.spec.placeholder}
                    rules={input.spec.rules}
                  />
                )}
                {input.spec.type == 'number' && (
                  <NumberInputField
                    ref={ref}
                    value={value}
                    onChange={(value) => setValue(value)}
                    onSubmit={submit}
                    onCompositionEnd={() => setIsComposing(false)}
                    onCompositionStart={() => setIsComposing(true)}
                    onFocus={abortAudioTask}
                    onKeyDown={handleKeyDown}
                    disabled={disabled && !loading}
                    placeholder={input.spec.placeholder}
                    rules={input.spec.rules}
                  />
                )}
              </>
            ) : (
              <DefaultInputField
                ref={ref}
                value={value}
                onSubmit={submit}
                disabled={disabled && !loading}
                onChange={(value) => setValue(value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onFocus={abortAudioTask}
              />
            )}
          </>
        )}
      </Stack>
    </Box>
  );
});

export default Input;
