import { useCallback, useEffect, useState } from 'react';

import { jsbridge } from './utils/bridge';

const base64ToBlob = (data: string) => {
  // 将 Base64 编码的数据转换为字节数组
  const byteCharacters = atob(data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  // 创建 Blob 对象
  return new Blob([byteArray], { type: 'audio/voice' });
};

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
        setFile(base64ToBlob(data));
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
