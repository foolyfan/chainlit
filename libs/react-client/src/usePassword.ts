import { useCallback, useState } from 'react';

import { jsbridge } from './utils/bridge';

export const usePassword = (title: string, hidePasswordView: boolean) => {
  const [text, setText] = useState<string>('');
  const [status, setStatus] = useState<'finish' | 'cancel' | 'init'>('init');

  const invokeKeyboard = useCallback(() => {
    setStatus('init');
    jsbridge.invoke(
      'keyBoardApi.getPasswd',
      JSON.stringify({
        title,
        hidePasswordView
      }),
      (res) => {
        const { ret, data } = JSON.parse(res);
        if (ret === 0) {
          setText(data);
        } else if (ret === 1) {
          console.log('输入完成');
          setStatus('finish');
        } else if (ret === 2) {
          console.log('取消输入');
          setStatus('cancel');
        }
      }
    );
  }, [title, hidePasswordView]);

  return {
    text,
    status,
    invokeKeyboard
  };
};
