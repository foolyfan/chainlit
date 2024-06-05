import { jsbridge } from './bridge';

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
  static supported: boolean = 'AudioContext' in window;
  audioContext: AudioContext | undefined;
  audioSource: AudioBufferSourceNode | undefined;

  async play(audioBuffer: ArrayBuffer) {
    this.stop();
    this.audioContext = new AudioContext();
    this.audioSource = this.audioContext.createBufferSource();

    this.audioSource.buffer = await this.audioContext.decodeAudioData(
      audioBuffer
    );
    this.audioSource.connect(this.audioContext.destination);
    this.audioSource.start();
  }

  stop() {
    if (this.audioSource) {
      this.audioSource.disconnect();
    }
    if (
      this.audioContext &&
      (this.audioContext.state == 'running' ||
        this.audioContext.state == 'suspended')
    ) {
      this.audioContext.close();
    }
  }
}

export const audioPlayer: AudioPlayer | undefined = AudioPlayer.supported
  ? new AudioPlayer()
  : undefined;
