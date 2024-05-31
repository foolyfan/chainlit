import { useCallback, useState } from 'react';

import { jsbridge } from './utils/speech';

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
  const [short, setShort] = useState<boolean>(false);
  const [stopTimeout, setStopTimeout] = useState<NodeJS.Timeout | undefined>(
    undefined
  );
  const [error, setError] = useState<string | undefined>();

  const startListening = useCallback(() => {
    setShort(false);
    setFile(undefined);
    setError(undefined);
    console.log('startListening');
    jsbridge.invoke('audioApi.startRecord', '', () => {});
  }, []);
  const stopListening = useCallback(() => {
    if (stopTimeout) {
      clearTimeout(stopTimeout);
    }
    setStopTimeout(
      setTimeout(() => {
        setError('本地语音库超时');
      }, 5000)
    );
    console.log('stopListening');
    jsbridge.invoke('audioApi.stopRecord', '', (res) => {
      const { ret, data, errMsg } = JSON.parse(res);
      console.log(`stopRecord ret ${ret} errMsg ${errMsg}`);
      if (ret == 8) {
        setFile(base64ToBlob(data));
      } else if (ret == 4) {
        setShort(true);
      } else {
        setError('无效信息');
      }
    });
  }, []);
  return {
    file,
    short,
    error,
    setShort,
    stopListening,
    startListening
  };
};

export { useSpeechRecognition };
