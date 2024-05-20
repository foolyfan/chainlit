import { atom } from 'recoil';

import {
  IMessageElement,
  IProjectSettings,
  IStep
} from '@chainlit/react-client';

export const projectSettingsState = atom<IProjectSettings | undefined>({
  key: 'ProjectSettings',
  default: undefined
});

export const sideViewState = atom<IMessageElement | undefined>({
  key: 'SideView',
  default: undefined
});

export const highlightMessage = atom<IStep['id'] | null>({
  key: 'HighlightMessage',
  default: null
});

export const chatSettingsOpenState = atom<boolean>({
  key: 'chatSettingsOpen',
  default: false
});
