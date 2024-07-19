import { isEmpty } from 'lodash';
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { useRecoilValue } from 'recoil';
import { accessTokenState, gatherCommandState } from 'src/state';

import { IProjectSettings } from './types/config';

import { ChainlitAPI } from './api';
import { sessionIdState, speechPromptsState } from './state';
import { audioPlayer, localTextToSpeech } from './utils/speech';

interface ChatProviderProps {
  children: ReactNode;
  chatSettings: IProjectSettings | undefined;
  client: ChainlitAPI;
}
interface ChatContextType {
  abortAudioTask: () => void;
  setAgreement: Dispatch<
    SetStateAction<{ src: string; display: string; data: string } | undefined>
  >;
  agreement:
    | {
        src: string;
        display: string;
        data: string;
      }
    | undefined;
  setPreview: Dispatch<
    SetStateAction<{ src: string; display: string } | undefined>
  >;
  checks: Array<string>;
  setChecks: Dispatch<SetStateAction<Array<string>>>;
  preview:
    | {
        src: string;
        display: string;
      }
    | undefined;
}
const ChatContext = createContext<ChatContextType | undefined>(undefined);

const ChatProvider: React.FC<ChatProviderProps> = ({
  children,
  chatSettings,
  client
}) => {
  const speechPrompt = useRecoilValue(speechPromptsState);
  const sessionId = useRecoilValue(sessionIdState);
  const [ttsRuning, setTtsRuning] = useState<boolean>(false);
  const ttsAbortRef = useRef<AbortController | undefined>(undefined);
  const accessToken = useRecoilValue(accessTokenState);
  const gatherCommand = useRecoilValue(gatherCommandState);

  useEffect(() => {
    if (
      chatSettings?.features.text_to_speech?.enabled &&
      speechPrompt &&
      audioPlayer
    ) {
      if (!isEmpty(speechPrompt.content)) {
        abortAudioTask();
        setTtsRuning(true);
        console.log('服务端tts');
        const controller = new AbortController();
        ttsAbortRef.current = controller;
        client
          .ttsMethod(
            speechPrompt.content,
            sessionId,
            controller.signal,
            accessToken
          )
          .then((response) => response.arrayBuffer())
          .then((arrayBuffer) => {
            console.log('音频资源加载完成');
            audioPlayer!.play(arrayBuffer);
          })
          .catch((error) => {
            console.log('play fail', error);
          })
          .finally(() => {
            setTtsRuning(false);
          });
      } else {
        console.log('客户端tts');
        localTextToSpeech(
          speechPrompt.content!,
          chatSettings?.features.text_to_speech?.params
        );
      }
    }
  }, [speechPrompt]);

  const abortAudioTask = useCallback(() => {
    audioPlayer?.stop();
    if (ttsRuning) {
      ttsAbortRef.current?.abort('中断tts请求');
    }
  }, [ttsRuning, ttsAbortRef]);

  const [agreement, setAgreement] = useState<
    | {
        src: string;
        display: string;
        data: string;
      }
    | undefined
  >();

  const [preview, setPreview] = useState<
    | {
        src: string;
        display: string;
      }
    | undefined
  >();

  const [checks, setChecks] = useState<Array<string>>([]);

  useEffect(() => {
    if (!gatherCommand) {
      abortAudioTask();
    }
  }, [gatherCommand]);

  return (
    <ChatContext.Provider
      value={{
        abortAudioTask,
        agreement,
        setAgreement,
        preview,
        setPreview,
        checks,
        setChecks
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export { ChatProvider, useChatContext };
