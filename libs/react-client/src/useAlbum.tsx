import { useCallback, useState } from 'react';

import { jsbridge } from './utils/bridge';

export const useAlbum = () => {
  const [text, setText] = useState<string>('');
  const [status, setStatus] = useState<'finish' | 'cancel' | 'init'>('init');

  const invokeAlbum = useCallback(() => {
    setStatus('init');
    setText('');
    jsbridge.apiManager.cameraApi
      .openAlbum()
      .then(({ ret, data, errMsg }) => {
        if (ret === 0) {
          setText(data);
        } else if (ret === 1) {
          console.log('选择完成');
          setStatus('finish');
        } else if (ret === 2) {
          console.log('取消选择');
          setStatus('cancel');
        } else {
          console.log('其他res', ret);
          console.log('其他data', data);
          console.log('其他errMsg', errMsg);
        }
      })
      .catch((e) => {
        console.error('打开相册异常', e);
      });
  }, []);

  return {
    text,
    status,
    invokeAlbum
  };
};
