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
  players: Howl[] = [];

  start(sources: string[]) {
    this.stop();
    this.players.push(
      new Howl({
        src: sources,
        html5: true,
        autoplay: true
      })
    );
  }

  stop() {
    this.players.map((player) => {
      player.stop();
      player.unload();
    });
    this.players = [];
  }
}

export const audioPlayer = new AudioPlayer();
