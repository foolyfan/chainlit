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
  const startListening = useCallback(() => {
    jsbridge.invoke('audioApi.startRecord', '', () => {});
  }, []);
  const stopListening = useCallback(() => {
    jsbridge.invoke('audioApi.stopRecord', '', (res) => {
      const { ret, data, errMsg } = JSON.parse(res);
      console.log(`stopRecord ret ${ret} errMsg ${errMsg}`);
      setShort(false);
      if (ret == 8) {
        setFile(base64ToBlob(data));
      }
      if (ret == 4) {
        setShort(true);
      }
    });
  }, []);
  return {
    file,
    short,
    stopListening,
    startListening
  };
};

export { useSpeechRecognition };
