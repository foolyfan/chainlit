const isAndroid = () => {
  return /Android/i.test(navigator.userAgent);
};

export { isAndroid };
