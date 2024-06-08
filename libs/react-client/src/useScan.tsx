import { useCallback, useState } from 'react';

import { jsbridge } from './utils/bridge';

const useScan = () => {
  const [imageData, setImageData] = useState<string | null>(null);
  const [status, setStatus] = useState<'finish' | 'cancel' | 'init'>('init');
  /**
   * 拍摄类型
   * 0-竖版凭证
   * 1-横版凭证
   * 2-身份证正面
   * 3-身份证反面
   * 4-人脸
   */
  // 获取图片数据
  const takePhoto = useCallback((type: number = 0) => {
    setImageData(null);
    setStatus('init');
    jsbridge.invoke(
      'cameraApi.openCiticCamera',
      {
        type
      },
      (res) => {
        const { ret, data } = JSON.parse(res);
        if (ret == 0) {
          setImageData(JSON.parse(data)['base64']);
          setStatus('finish');
        } else {
          setStatus('cancel');
        }
      }
    );
  }, []);

  // 清除图片数据
  const clearImage = useCallback(() => {
    setImageData(null);
  }, []);

  return {
    status,
    imageData,
    takePhoto,
    clearImage
  };
};

export { useScan };
