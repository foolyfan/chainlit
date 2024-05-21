import { apiClient } from 'api';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';

import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import { IconButton, Theme, Tooltip, useMediaQuery } from '@mui/material';

import { Translator } from 'components/i18n';

import { projectSettingsState } from 'state/project';

import { useChatSession, useSpeechRecognition } from 'client-types/*';

interface Props {
  onSpeech: (text: string) => void;
  language?: string;
  disabled?: boolean;
}

const SpeechButton = ({ onSpeech, disabled }: Props) => {
  const projectSettings = useRecoilValue(projectSettingsState);
  if (!projectSettings?.features.speech_to_text?.enabled) {
    return null;
  }
  const { sessionId } = useChatSession();
  const { recordFile, startListening, stopListening } =
    useSpeechRecognition('测试');
  const [isRecording, setIsRecording] = useState(false);
  // const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  useEffect(() => {
    console.log('解析文件');
    const { promise } = apiClient.asrMethod(
      recordFile as File,
      () => {},
      sessionId
    );
    promise.then((res) => {
      onSpeech(res.content);
    });
  }, [recordFile]);

  // useEffect(() => {
  //   if (isRecording) {
  //     if (timer) {
  //       clearTimeout(timer);
  //     }
  //     setTimer(
  //       setTimeout(() => {
  //         console.log('超时停止');

  //         setIsRecording(false);
  //         stopListening();
  //       }, 2000) // stop after 3 seconds of silence
  //     );
  //   }
  // }, [recordFile, isRecording]);

  const size = useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'))
    ? 'small'
    : 'medium';

  return isRecording ? (
    <Tooltip
      title={
        <Translator path="components.organisms.chat.inputBox.speechButton.stop" />
      }
    >
      <span>
        <IconButton
          disabled={disabled}
          color="inherit"
          size={size}
          onClick={() => {
            setIsRecording(false);
            stopListening();
          }}
        >
          <StopCircleIcon fontSize={size} />
        </IconButton>
      </span>
    </Tooltip>
  ) : (
    <Tooltip
      title={
        <Translator path="components.organisms.chat.inputBox.speechButton.start" />
      }
    >
      <span>
        <IconButton
          disabled={disabled}
          color="inherit"
          size={size}
          onClick={() => {
            setIsRecording(true);
            startListening();
          }}
        >
          <KeyboardVoiceIcon fontSize={size} />
        </IconButton>
      </span>
    </Tooltip>
  );
};
export default SpeechButton;
