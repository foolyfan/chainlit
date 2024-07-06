export type Rule = (value: string) => boolean | string;

export const nativeRules = {
  ChinesePhoneNumberRule: (value: string) => {
    const regex = /^1[3-9]\d{9}$/;
    return regex.test(value) || '手机号码格式不正确';
  },
  DecimalPlaces: (value: string) => {
    const regex = /^\d*\.?\d{0,2}$/;
    return regex.test(value) || '金额只可保留两位小数';
  }
};
