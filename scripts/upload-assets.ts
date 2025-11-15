import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
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

const ASSET_MAPPINGS = [
  {
    bucket: 'game-models',
    localDir: './client/public/models',
    files: ['rally-car.glb', 'frailejon.glb'],
  },
  {
    bucket: 'game-models',
    localDir: './client/public',
    files: ['pixel-bunny-3d.glb'],
  },
  {
    bucket: 'game-models',
    localDir: './client/public/geometries',
    files: ['heart.gltf'],
  },
  {
    bucket: 'game-textures',
    localDir: './client/public/textures',
    files: ['asphalt.png', 'grass.png', 'sand.jpg', 'sky.png', 'wood.jpg'],
  },
  {
    bucket: 'game-textures',
    localDir: './client/public',
    files: ['pixel-bunny.png', 'dream-nexus-logo.png'],
  },
  {
    bucket: 'game-audio',
    localDir: './client/public/sounds',
    files: ['background.mp3', 'hit.mp3', 'success.mp3'],
  },
];

async function uploadAssets() {
  console.log('Uploading assets to Supabase Storage...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const mapping of ASSET_MAPPINGS) {
    for (const filename of mapping.files) {
      const localPath = join(mapping.localDir, filename);
      const remotePath = filename;

      try {
        // Check if file exists locally
        const fileBuffer = readFileSync(localPath);

        // Skip dummy files (20 bytes)
        if (fileBuffer.length === 20) {
          console.log(`⊘ Skipping dummy file: ${filename}`);
          skipCount++;
          continue;
        }

        // Determine content type
        const contentType = getContentType(filename);

        // Upload to Supabase
        const { error } = await supabase.storage
          .from(mapping.bucket)
          .upload(remotePath, fileBuffer, {
            contentType,
            upsert: true,
          });

        if (error) {
          console.error(`✗ Failed to upload ${filename}:`, error.message);
          errorCount++;
        } else {
          console.log(`✓ Uploaded ${filename} to ${mapping.bucket}/ (${formatBytes(fileBuffer.length)})`);
          successCount++;
        }
      } catch (err: any) {
        console.error(`✗ Error reading ${localPath}:`, err.message);
        errorCount++;
      }
    }
  }

  console.log(`\n--- Upload Summary ---`);
  console.log(`✓ Successful: ${successCount}`);
  console.log(`⊘ Skipped (dummy): ${skipCount}`);
  console.log(`✗ Failed: ${errorCount}`);

  if (skipCount > 0) {
    console.log('\n⚠️  Some files were skipped because they are dummy placeholders.');
    console.log('Please add the real asset files to client/public/ and run this script again.');
  }
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    glb: 'model/gltf-binary',
    gltf: 'model/gltf+json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    mp3: 'audio/mpeg',
  };
  return types[ext || ''] || 'application/octet-stream';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

uploadAssets().catch(console.error);
