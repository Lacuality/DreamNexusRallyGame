export class AudioManager {
  private bgMusic: HTMLAudioElement | null = null;
  private engineSound: HTMLAudioElement | null = null;
  private crashSound: HTMLAudioElement | null = null;
  private successSound: HTMLAudioElement | null = null;
  private nitroSound: HTMLAudioElement | null = null;
  private shieldSound: HTMLAudioElement | null = null;
  private splashSound: HTMLAudioElement | null = null;
  private pickupSound: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private enginePlaying: boolean = false;
  
  constructor() {
    this.initAudio();
  }
  
  private initAudio() {
    this.bgMusic = new Audio("/sounds/background.mp3");
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.3;
    
    this.crashSound = new Audio("/sounds/hit.mp3");
    this.crashSound.volume = 0.5;
    
    this.successSound = new Audio("/sounds/success.mp3");
    this.successSound.volume = 0.4;
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
  
  playSuccess() {
    if (this.successSound && !this.isMuted) {
      const clone = this.successSound.cloneNode() as HTMLAudioElement;
      clone.volume = 0.4;
      clone.play().catch(err => console.log("Success sound prevented:", err));
    }
  }
  
  startEngineSound() {
    if (!this.engineSound || this.isMuted || this.enginePlaying) return;
    this.engineSound.loop = true;
    this.engineSound.play().catch(err => console.log("Engine sound prevented:", err));
    this.enginePlaying = true;
  }
  
  stopEngineSound() {
    if (!this.engineSound) return;
    this.engineSound.pause();
    this.engineSound.currentTime = 0;
    this.enginePlaying = false;
  }
  
  updateEngineSound(speed: number) {
    if (!this.engineSound || this.isMuted) return;
    const maxSpeed = 180;
    const minPitch = 0.6;
    const maxPitch = 1.8;
    const pitchRange = maxPitch - minPitch;
    const speedRatio = Math.min(speed / maxSpeed, 1);
    const pitchFactor = minPitch + speedRatio * pitchRange;
    
    this.engineSound.playbackRate = pitchFactor;
    this.engineSound.volume = 0.15 + speedRatio * 0.15;
  }
  
  playNitro() {
    if (this.nitroSound && !this.isMuted) {
      const clone = this.nitroSound.cloneNode() as HTMLAudioElement;
      clone.volume = 0.6;
      clone.play().catch(err => console.log("Nitro sound prevented:", err));
    }
  }
  
  playShield() {
    if (this.shieldSound && !this.isMuted) {
      const clone = this.shieldSound.cloneNode() as HTMLAudioElement;
      clone.volume = 0.5;
      clone.play().catch(err => console.log("Shield sound prevented:", err));
    }
  }
  
  playSplash() {
    if (this.splashSound && !this.isMuted) {
      const clone = this.splashSound.cloneNode() as HTMLAudioElement;
      clone.volume = 0.4;
      clone.play().catch(err => console.log("Splash sound prevented:", err));
    }
  }
  
  playPickup() {
    if (this.pickupSound && !this.isMuted) {
      const clone = this.pickupSound.cloneNode() as HTMLAudioElement;
      clone.volume = 0.5;
      clone.play().catch(err => console.log("Pickup sound prevented:", err));
    }
  }
  
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.bgMusic) this.bgMusic.pause();
      if (this.engineSound) this.engineSound.pause();
    } else {
      if (this.bgMusic) this.bgMusic.play().catch(err => console.log("Audio play prevented:", err));
      if (this.engineSound && this.enginePlaying) {
        this.engineSound.play().catch(err => console.log("Engine sound prevented:", err));
      }
    }
    return this.isMuted;
  }
  
  cleanup() {
    this.stopBackgroundMusic();
    this.stopEngineSound();
    if (this.bgMusic) this.bgMusic.remove();
    if (this.engineSound) this.engineSound.remove();
    if (this.crashSound) this.crashSound.remove();
    if (this.successSound) this.successSound.remove();
    if (this.nitroSound) this.nitroSound.remove();
    if (this.shieldSound) this.shieldSound.remove();
    if (this.splashSound) this.splashSound.remove();
    if (this.pickupSound) this.pickupSound.remove();
  }
}

export const audioManager = new AudioManager();
