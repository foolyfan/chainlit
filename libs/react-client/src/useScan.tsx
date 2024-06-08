import { useCallback, useState } from 'react';

import { base64ToBlob, jsbridge } from './utils/bridge';

const useScan = () => {
  const [imageFile, setImageFile] = useState<Blob | null>(null);
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
    setImageFile(null);
    setStatus('init');
    jsbridge.invoke(
      'cameraApi.openCiticCamera',
      {
        type
      },
      (res) => {
        const { ret, data } = JSON.parse(res);
        if (ret == 0) {
          setImageFile(base64ToBlob(JSON.parse(data)['base64'], 'image/jpeg'));
          setStatus('finish');
        } else {
          setStatus('cancel');
        }
      }
    );
  }, []);

  // 清除图片数据
  const clearImage = useCallback(() => {
    setImageFile(null);
  }, []);

  return {
    status,
    imageFile,
    takePhoto,
    clearImage
  };
};

export { useScan };
