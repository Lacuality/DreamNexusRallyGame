import { getAssetUrl } from './supabase';

// Asset bucket names
const MODELS_BUCKET = 'game-models';
const TEXTURES_BUCKET = 'game-textures';
const AUDIO_BUCKET = 'game-audio';

// 3D Models
export const ASSETS = {
  models: {
    rallycar: () => getAssetUrl(MODELS_BUCKET, 'rally-car.glb'),
    frailejon: () => getAssetUrl(MODELS_BUCKET, 'frailejon.glb'),
    pixelBunny: () => getAssetUrl(MODELS_BUCKET, 'pixel-bunny-3d.glb'),
    heart: () => getAssetUrl(MODELS_BUCKET, 'heart.gltf'),
  },
  textures: {
    asphalt: () => getAssetUrl(TEXTURES_BUCKET, 'asphalt.png'),
    grass: () => getAssetUrl(TEXTURES_BUCKET, 'grass.png'),
    sand: () => getAssetUrl(TEXTURES_BUCKET, 'sand.jpg'),
    sky: () => getAssetUrl(TEXTURES_BUCKET, 'sky.png'),
    wood: () => getAssetUrl(TEXTURES_BUCKET, 'wood.jpg'),
    pixelBunny: () => getAssetUrl(TEXTURES_BUCKET, 'pixel-bunny.png'),
    logo: () => getAssetUrl(TEXTURES_BUCKET, 'dream-nexus-logo.png'),
  },
  audio: {
    background: () => getAssetUrl(AUDIO_BUCKET, 'background.mp3'),
    hit: () => getAssetUrl(AUDIO_BUCKET, 'hit.mp3'),
    success: () => getAssetUrl(AUDIO_BUCKET, 'success.mp3'),
  },
  fonts: {
    inter: '/fonts/inter.json', // Keep local as it's small JSON
  }
};

// Bucket configurations for setup
export const BUCKET_CONFIG = [
  {
    name: MODELS_BUCKET,
    public: true,
    allowedMimeTypes: ['model/gltf-binary', 'model/gltf+json'],
  },
  {
    name: TEXTURES_BUCKET,
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
  },
  {
    name: AUDIO_BUCKET,
    public: true,
    allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
  },
];
