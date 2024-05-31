import { apiClient } from 'api';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@mui/material';

import {
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
  const { file, short, error, startListening, stopListening } =
    useSpeechRecognition();
  const { abortAudioTask } = useChatContext();
  const [speechRecognitionRuning, setSpeechRecognitionRuning] =
    useState<boolean>(false);
  useEffect(() => {
    if (short) {
      setSpeechRecognitionRuning(false);
      toast.info('说话时间太短');
      return;
    }
    if (file) {
      apiClient
        .asrMethod(file as File, () => {}, sessionId)
        .promise.then((response) => {
          onSpeech(response.content);
        })
        .catch((error) => {
          console.error('asr error:', error);
        })
        .finally(() => {
          setSpeechRecognitionRuning(false);
        });
    }
  }, [file, short]);

  useEffect(() => {
    onSpeechRecognitionRuning(speechRecognitionRuning);
  }, [speechRecognitionRuning]);

  useEffect(() => {
    if (error) {
      setSpeechRecognitionRuning(false);
    }
  }, [error]);

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
          backgroundColor: '#F80061'
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
