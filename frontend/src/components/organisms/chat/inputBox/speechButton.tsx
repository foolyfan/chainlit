import { apiClient } from 'api';
import { useCallback, useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { toast } from 'sonner';

import { Button } from '@mui/material';

import {
  accessTokenState,
  useChatContext,
  useChatSession,
  useSpeechRecognition
} from '@chainlit/react-client';

interface Props {
  onSpeech: (text: string) => void;
  onSpeechRecognitionRuning: (state: boolean) => void;
}

const SpeechButton = ({ onSpeech, onSpeechRecognitionRuning }: Props) => {
  const { sessionId } = useChatSession();
  const { file, error, startListening, stopListening } = useSpeechRecognition();
  const { abortAudioTask } = useChatContext();
  const [speechRecognitionRuning, setSpeechRecognitionRuning] =
    useState<boolean>(false);
  const accessToken = useRecoilValue(accessTokenState);
  useEffect(() => {
    if (error) {
      setSpeechRecognitionRuning(false);
      toast.info(`录音异常：${error}`);
      return;
    }
    if (file) {
      apiClient
        .asrMethod(file as File, () => {}, sessionId, accessToken)
        .promise.then((response) => {
          onSpeech(response.content);
        })
        .catch((error) => {
          console.error(error);
          toast.error(error.toString());
        })
        .finally(() => {
          setSpeechRecognitionRuning(false);
        });
    }
  }, [file, error]);

  useEffect(() => {
    onSpeechRecognitionRuning(speechRecognitionRuning);
  }, [speechRecognitionRuning]);

  const handleStart = useCallback(() => {
    abortAudioTask();
    startListening();
  }, []);

  const handleEnd = useCallback(() => {
    setSpeechRecognitionRuning(true);
    stopListening();
  }, []);

  return (
    <Button
      disabled={speechRecognitionRuning}
      variant="outlined"
      fullWidth
      sx={{
        height: '3.5em',
        boxShadow: 'none',
        border: 'none',
        color: 'text.primary',
        backgroundColor: 'background.paper',
        '&:hover': {
          border: 'none !important',
          backgroundColor: 'transparent'
        },
        '&:active': {
          backgroundColor: '#019ddf'
        }
      }}
      onKeyUp={handleEnd}
      onKeyDown={handleStart}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
    >
      {speechRecognitionRuning ? '语音解析中...' : '按住说话'}
    </Button>
  );
};
export default SpeechButton;
