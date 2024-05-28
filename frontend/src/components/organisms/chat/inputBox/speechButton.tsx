import { apiClient } from 'api';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@mui/material';

import { useChatSession, useSpeechRecognition } from 'client-types/*';

interface Props {
  onSpeech: (text: string) => void;
  onSpeechRecognitionRuning: (state: boolean) => void;
}

const SpeechButton = ({ onSpeech, onSpeechRecognitionRuning }: Props) => {
  const { sessionId } = useChatSession();
  const { file, short, startListening, stopListening } = useSpeechRecognition();
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
      onKeyDown={() => {
        setSpeechRecognitionRuning(true);
        stopListening();
      }}
      onTouchStart={() => startListening()}
      onTouchEnd={() => {
        setSpeechRecognitionRuning(true);
        stopListening();
      }}
    >
      {speechRecognitionRuning ? '语音解析中...' : '按住说话'}
    </Button>
  );
};
export default SpeechButton;
