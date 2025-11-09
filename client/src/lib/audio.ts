export class AudioManager {
  private bgMusic: HTMLAudioElement | null = null;
  private engineSound: HTMLAudioElement | null = null;
  private crashSound: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  
  constructor() {
    this.initAudio();
  }
  
  private initAudio() {
    this.bgMusic = new Audio("/sounds/background.mp3");
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.3;
    
    this.crashSound = new Audio("/sounds/hit.mp3");
    this.crashSound.volume = 0.5;
  }
  
  playBackgroundMusic() {
    if (this.bgMusic && !this.isMuted) {
      this.bgMusic.play().catch(err => console.log("Audio play prevented:", err));
    }
  }
  
  stopBackgroundMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    }
  }
  
  playCrash() {
    if (this.crashSound && !this.isMuted) {
      const clone = this.crashSound.cloneNode() as HTMLAudioElement;
      clone.volume = 0.5;
      clone.play().catch(err => console.log("Crash sound prevented:", err));
    }
  }
  
  updateEngineSound(speed: number) {
    const maxSpeed = 220;
    const pitchFactor = 0.5 + (speed / maxSpeed) * 1.5;
  }
  
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.bgMusic) {
      this.bgMusic.pause();
    } else if (!this.isMuted && this.bgMusic) {
      this.bgMusic.play().catch(err => console.log("Audio play prevented:", err));
    }
    return this.isMuted;
  }
  
  cleanup() {
    this.stopBackgroundMusic();
    if (this.bgMusic) {
      this.bgMusic.remove();
    }
    if (this.crashSound) {
      this.crashSound.remove();
    }
  }
}

export const audioManager = new AudioManager();
