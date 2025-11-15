import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase credentials in .env file');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKETS = [
  { name: 'game-models', public: true },
  { name: 'game-textures', public: true },
  { name: 'game-audio', public: true },
];

async function setupStorage() {
  console.log('Setting up Supabase Storage buckets...\n');

  for (const bucket of BUCKETS) {
    console.log(`Checking bucket: ${bucket.name}`);

    // Check if bucket exists
    const { data: existing } = await supabase.storage.getBucket(bucket.name);

    if (existing) {
      console.log(`✓ Bucket '${bucket.name}' already exists`);
    } else {
      // Create bucket
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: 52428800, // 50MB
      });

      if (error) {
        console.error(`✗ Error creating bucket '${bucket.name}':`, error.message);
      } else {
        console.log(`✓ Created bucket '${bucket.name}'`);
      }
    }
  }

  console.log('\n✓ Storage setup complete!');
  console.log('\nNext steps:');
  console.log('1. Upload your asset files using the Supabase Dashboard:');
  console.log(`   ${supabaseUrl}/project/default/storage/buckets`);
  console.log('\n2. Or use the upload script:');
  console.log('   npm run upload-assets');
  console.log('\nRequired files:');
  console.log('  game-models/');
  console.log('    - rally-car.glb');
  console.log('    - frailejon.glb');
  console.log('    - pixel-bunny-3d.glb');
  console.log('    - heart.gltf');
  console.log('  game-textures/');
  console.log('    - asphalt.png, grass.png, sand.jpg, sky.png, wood.jpg');
  console.log('    - pixel-bunny.png, dream-nexus-logo.png');
  console.log('  game-audio/');
  console.log('    - background.mp3, hit.mp3, success.mp3');
}

setupStorage().catch(console.error);
