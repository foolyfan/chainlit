import { Howl } from 'howler';
import SRJSBridge from 'siro-face-jsbridge';

export const jsbridge = new SRJSBridge();

export const localTextToSpeech = (content: string, params: any): void => {
  console.log(`textToSpeech ${content}`, params);
  jsbridge.invoke(
    'voicettsApi.speakText',
    JSON.stringify({ content }),
    () => {}
  );
};

export const speechToText = () => {
  console.log('speechToText');
};

class AudioPlayer {
  player: Howl | undefined;
  src: string | undefined;

  start(src: string) {
    this.stop();
    this.player = new Howl({
      src: [src],
      html5: true,
      autoplay: true
    });
  }

  stop() {
    this.player!.stop();
    this.player!.unload();
    if (this.src) {
      URL.revokeObjectURL(this.src);
    }
  }
}

class AudioPlayerDom {
  audioElement: HTMLAudioElement | undefined;
  src: string | undefined;

  start(src: string) {
    console.log('播放语音');

    this.stop();
    this.audioElement = document.createElement('audio');
    this.audioElement.controls = true;
    this.audioElement.autoplay = true; // 开启自动播放
    // 设置音频源
    this.audioElement.src = src;
  }

  stop() {
    this.audioElement?.pause();
    this.audioElement?.remove();
    if (this.src) {
      URL.revokeObjectURL(this.src);
    }
  }
}

export function decodeAndConcatAudioFiles(audioBuffers: any): Promise<any> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    // 创建AudioContext对象
    const audioContext = new AudioContext();
    const audioSource = audioContext.createBufferSource();
    // // 将拼接后的音频数据设置给AudioBufferSourceNode对象
    audioSource.buffer = await audioContext.decodeAudioData(audioBuffers);
    // // 将AudioBufferSourceNode连接到AudioContext的destination
    audioSource.connect(audioContext.destination);
    // // 播放拼接后的音频文件
    audioSource.start();
    audioSource.onended = () => {
      resolve('success');
    };
  });
}

export { AudioPlayer, AudioPlayerDom };
