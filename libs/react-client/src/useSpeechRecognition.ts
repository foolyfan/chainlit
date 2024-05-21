import { useCallback, useState } from 'react';

const useSpeechRecognition = (content: string) => {
  const [recordFile, setFile] = useState<Blob | undefined>(undefined);
  const startListening = useCallback(() => {
    console.log('开启录制');
  }, []);
  const stopListening = useCallback(() => {
    console.log('停止录制');
    const blob = new Blob([content], { type: 'text/plain' });
    setFile(blob);
  }, []);
  return {
    recordFile,
    stopListening,
    startListening
  };
};

export { useSpeechRecognition };
