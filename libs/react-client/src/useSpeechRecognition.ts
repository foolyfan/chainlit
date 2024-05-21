import { useCallback, useState } from 'react';

import { jsbridge } from './utils/speech';

const useSpeechRecognition = () => {
  const [path, setPath] = useState<string | undefined>(undefined);
  const startListening = useCallback(() => {
    jsbridge.invoke('audioApi.startRecord', '', () => {});
  }, []);
  const stopListening = useCallback(() => {
    jsbridge.invoke('audioApi.stopRecord', '', (res) => {
      console.log(`stopRecord res ${res}`);

      const { ret, data, errMsg } = JSON.parse(res);
      console.log(`stopRecord ret ${ret} data ${data} errMsg ${errMsg}`);
      if (ret == 8) {
        setPath(data);
      }
    });
  }, []);
  return {
    path,
    stopListening,
    startListening
  };
};

export { useSpeechRecognition };
