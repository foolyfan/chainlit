import { Howl } from 'howler';

export const textToSpeech = (content: string, params: any): string => {
  console.log(`textToSpeech ${content}`, params);
  return '';
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
