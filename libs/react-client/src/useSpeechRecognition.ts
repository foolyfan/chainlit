import { useCallback, useEffect, useState } from 'react';

import { base64ToBlob, jsbridge } from './utils/bridge';

const useSpeechRecognition = () => {
  const [file, setFile] = useState<Blob | undefined>(undefined);
  const [stopTimeout, setStopTimeout] = useState<NodeJS.Timeout | undefined>(
    undefined
  );
  const [error, setError] = useState<string | undefined>();

  const startListening = useCallback(() => {
    setFile(undefined);
    setError(undefined);
    console.log('startListening');
    jsbridge.invoke('audioApi.startRecord', '', () => {});
  }, []);
  const stopListening = useCallback(() => {
    console.log('stopListening');
    if (stopTimeout) {
      clearTimeout(stopTimeout);
    }
    setStopTimeout(
      setTimeout(() => {
        setError('本地停止语音调用超时');
      }, 5000)
    );

    jsbridge.invokeStrict(
      'audioApi.stopRecord',
      '',
      (res) => {
        console.log('录音成功');
        const { data } = JSON.parse(res);
        setFile(base64ToBlob(data, 'audio/voice'));
      },
      (res) => {
        console.log(`录音失败返回 ${res}`);
        const { errMsg } = JSON.parse(res);
        setError(errMsg);
      }
    );
  }, []);
  useEffect(() => {
    if (error || file) {
      clearTimeout(stopTimeout);
    }
  }, [error, file]);
  return {
    file,
    error,
    stopListening,
    startListening
  };
};

export { useSpeechRecognition };
