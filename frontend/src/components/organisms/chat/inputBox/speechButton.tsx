import { apiClient } from 'api';
import { useEffect, useState } from 'react';

import { Button } from '@mui/material';

import { useChatSession, useSpeechRecognition } from 'client-types/*';

interface Props {
  onSpeech: (text: string) => void;
  onSpeechRecognitionRuning: (state: boolean) => void;
}

const SpeechButton = ({ onSpeech, onSpeechRecognitionRuning }: Props) => {
  const { sessionId } = useChatSession();
  const { file, startListening, stopListening } = useSpeechRecognition();
  const [speechRecognitionRuning, setSpeechRecognitionRuning] =
    useState<boolean>(false);
  useEffect(() => {
    if (file) {
      setSpeechRecognitionRuning(true);
      onSpeechRecognitionRuning(true);
      apiClient
        .asrMethod(file as File, () => {}, sessionId)
        .promise.then((response) => {
          onSpeech(response.content);
        })
        .catch((error) => {
          console.error('asr error:', error);
        })
        .finally(() => {
          onSpeechRecognitionRuning(false);
          setSpeechRecognitionRuning(false);
        });
    }
  }, [file]);

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
      onKeyUp={() => startListening()}
      onKeyDown={() => stopListening()}
      onTouchStart={() => startListening()}
      onTouchEnd={() => stopListening()}
    >
      {speechRecognitionRuning ? '语音解析中...' : '按住说话'}
    </Button>
  );
};
export default SpeechButton;
