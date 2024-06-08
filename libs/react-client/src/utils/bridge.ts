import SRJSBridge from 'siro-face-jsbridge';

export const base64ToBlob = (data: string, type: string) => {
  // 将 Base64 编码的数据转换为字节数组
  const byteCharacters = atob(data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  // 创建 Blob 对象
  return new Blob([byteArray], { type });
};

export const jsbridge = new SRJSBridge();
