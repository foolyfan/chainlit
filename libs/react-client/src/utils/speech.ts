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
  static supported: boolean = 'AudioContext' in window;
  audioContext: AudioContext | undefined;
  audioSource: AudioBufferSourceNode | undefined;

  async play(audioBuffer: ArrayBuffer) {
    if (this.audioSource) {
      this.audioSource.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioContext = new AudioContext();
    this.audioSource = this.audioContext.createBufferSource();

    this.audioSource.buffer = await this.audioContext.decodeAudioData(
      audioBuffer
    );
    this.audioSource.connect(this.audioContext.destination);
    this.audioSource.start();
  }
}

export const audioPlayer: AudioPlayer | undefined = AudioPlayer.supported
  ? new AudioPlayer()
  : undefined;
