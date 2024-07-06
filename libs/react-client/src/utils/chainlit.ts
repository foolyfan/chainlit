import { Rule, nativeRules } from './rules';

export interface Chainlit {
  __rules__: { [key: string]: Rule };
  installRules: (rules: { [key: string]: Rule }) => void;
}

const installRules = (rules: { [key: string]: Rule }) => {
  window.__chainlit__.__rules__ = {
    ...window.__chainlit__.__rules__,
    ...rules
  };
};

if (!window.__chainlit__) {
  window.__chainlit__ = { installRules, __rules__: { ...nativeRules } };
}

window.dispatchEvent(new CustomEvent('chainlit_ready'));
