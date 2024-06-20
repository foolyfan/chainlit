import { useAuth } from 'api/auth';
import { useCallback, useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import { router } from 'router';
import { Toaster } from 'sonner';
import { makeTheme } from 'theme';

import { Box, GlobalStyles } from '@mui/material';
import { Theme, ThemeProvider } from '@mui/material/styles';

import {
  BrightnessModeOptions,
  FontOptions,
  useChatData,
  useChatSession
} from '@chainlit/react-client';

import Hotkeys from 'components/Hotkeys';
import SettingsModal from 'components/molecules/settingsModal';
import ChatSettingsModal from 'components/organisms/chat/settings';
import PromptPlayground from 'components/organisms/playground';

import { apiClientState } from 'state/apiClient';
import { projectSettingsState } from 'state/project';
import { ThemeVariant, settingsState } from 'state/settings';
import { userEnvState } from 'state/user';

import './App.css';

type Primary = {
  dark?: string;
  light?: string;
  main?: string;
};

type ThemOverride = {
  primary?: Primary;
  background?: string;
  paper?: string;
};

declare global {
  interface Window {
    theme?: {
      light?: ThemOverride;
      dark?: ThemOverride;
    };
  }
}

export function overrideTheme(theme: Theme) {
  const variant = theme.palette.mode;
  const variantOverride = window?.theme?.[variant] as ThemOverride;
  if (variantOverride?.background) {
    theme.palette.background.default = variantOverride.background;
  }
  if (variantOverride?.paper) {
    theme.palette.background.paper = variantOverride.paper;
  }
  if (variantOverride?.primary?.main) {
    theme.palette.primary.main = variantOverride.primary.main;
  }
  if (variantOverride?.primary?.dark) {
    theme.palette.primary.dark = variantOverride.primary.dark;
  }
  if (variantOverride?.primary?.light) {
    theme.palette.primary.light = variantOverride.primary.light;
  }

  return theme;
}

function App() {
  const [settings, setSettings] = useRecoilState(settingsState);
  const pSettings = useRecoilValue(projectSettingsState);
  // @ts-expect-error custom property
  const fontFamily = window.theme?.font_family;
  const [theme, setTheme] = useState<Theme>();
  useEffect(() => {
    switchTheme(settings.theme);
    setTheme(() => overrideTheme(makeTheme(settings.theme, fontFamily)));
  }, [settings.theme]);

  const { isAuthenticated, accessToken } = useAuth();
  const userEnv = useRecoilValue(userEnvState);
  const { connect, chatProfile, setChatProfile } = useChatSession();
  const apiClient = useRecoilValue(apiClientState);

  const pSettingsLoaded = !!pSettings;

  const chatProfileOk = pSettingsLoaded
    ? pSettings.chatProfiles.length
      ? !!chatProfile
      : true
    : false;

  const { uiSettingsCommand } = useChatData();

  const switchTheme = useCallback((mode?: ThemeVariant) => {
    const rootElement: HTMLDivElement | null = document.querySelector(
      '#root > .MuiBox-root'
    )!;
    if (!rootElement) {
      return;
    }
    if (mode == 'dark') {
      if (rootElement) {
        rootElement.style.backgroundImage = 'none';
      }
    } else {
      rootElement.style.backgroundImage =
        'radial-gradient(at right top, #dbe4f9 20%, #ecf0fc 60%, #f6f7fc)';
    }
  }, []);

  useEffect(() => {
    if (!uiSettingsCommand) {
      return;
    }

    if (uiSettingsCommand.spec.type == 'mode') {
      const mode = (uiSettingsCommand.spec as BrightnessModeOptions).mode;

      switchTheme(mode);
      setSettings((old) => ({
        ...old,
        theme: mode
      }));
    }
    console.log('uiSettingsCommand', uiSettingsCommand);

    if (uiSettingsCommand.spec.type == 'font' && theme) {
      const font = uiSettingsCommand.spec as FontOptions;
      const curFontSize = theme.typography.fontSize;
      console.log('uiSettingsCommand curFontSize', curFontSize);
      let newFontSize = curFontSize;
      if (font.fontSize?.type == 'add') {
        newFontSize = curFontSize + font.fontSize.offset;
      }
      if (font.fontSize?.type == 'reduce') {
        newFontSize = curFontSize - font.fontSize.offset;
      }
      console.log('uiSettingsCommand newFontSize', newFontSize);
      if (newFontSize > 0) {
        setTheme(() =>
          overrideTheme(makeTheme(settings.theme, font.fontFamily, newFontSize))
        );
      }
    }
  }, [uiSettingsCommand]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    } else if (!chatProfileOk) {
      return;
    } else {
      connect({
        client: apiClient,
        userEnv,
        accessToken
      });
    }
  }, [userEnv, accessToken, isAuthenticated, connect, chatProfileOk]);

  if (pSettingsLoaded && pSettings.chatProfiles.length && !chatProfile) {
    // Autoselect the chat profile if there is only one
    setChatProfile(pSettings.chatProfiles[0].name);
  }

  if (!theme) {
    return null;
  }
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles
        styles={{
          body: { backgroundColor: theme.palette.background.default }
        }}
      />
      <Toaster
        className="toast"
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: theme.typography.fontFamily,
            background: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary
          }
        }}
      />
      <Box
        display="flex"
        height="100vh"
        width="100vw"
        sx={{ overflowX: 'hidden' }}
      >
        <PromptPlayground />
        <ChatSettingsModal />
        <Hotkeys />
        <SettingsModal />
        <RouterProvider router={router} />
      </Box>
    </ThemeProvider>
  );
}

export default App;
