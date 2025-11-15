/*
  # Create Storage Buckets for Game Assets

  1. New Storage Buckets
    - `game-models` - For 3D model files (.glb, .gltf)
    - `game-textures` - For texture image files (.png, .jpg)
    - `game-audio` - For audio files (.mp3)

  2. Security
    - All buckets are publicly accessible for read operations
    - Files can be viewed without authentication
    - Upload requires authentication (for game admins)

  3. Notes
    - File size limit: 50MB per file
    - Public access enabled for game asset delivery
*/

-- Create storage buckets for game assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('game-models', 'game-models', true, 52428800, ARRAY['model/gltf-binary', 'model/gltf+json']::text[]),
  ('game-textures', 'game-textures', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg']::text[]),
  ('game-audio', 'game-audio', true, 52428800, ARRAY['audio/mpeg', 'audio/mp3']::text[])
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all game asset buckets
CREATE POLICY "Public read access for game models"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'game-models');

CREATE POLICY "Public read access for game textures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'game-textures');

CREATE POLICY "Public read access for game audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'game-audio');

-- Allow authenticated users to upload (for admins/developers)
CREATE POLICY "Authenticated users can upload game models"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'game-models');

CREATE POLICY "Authenticated users can upload game textures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'game-textures');

CREATE POLICY "Authenticated users can upload game audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'game-audio');

-- Allow authenticated users to update (for admins/developers)
CREATE POLICY "Authenticated users can update game models"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'game-models')
  WITH CHECK (bucket_id = 'game-models');

CREATE POLICY "Authenticated users can update game textures"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'game-textures')
  WITH CHECK (bucket_id = 'game-textures');

CREATE POLICY "Authenticated users can update game audio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'game-audio')
  WITH CHECK (bucket_id = 'game-audio');
