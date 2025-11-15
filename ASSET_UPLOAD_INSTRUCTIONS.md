# Asset Upload Instructions

## The Problem
Your game assets keep disappearing because Bolt uses an **ephemeral temporary filesystem**. Every time your Bolt session restarts, any files you manually added are deleted. This is by design - Bolt's environment is not meant for persistent file storage.

## The Solution
All game assets are now stored in **Supabase Storage**, which persists permanently between sessions.

---

## Step 1: Apply the Storage Migration

The storage buckets have been created via migration. The buckets are:
- `game-models` - For 3D models (.glb, .gltf files)
- `game-textures` - For images (.png, .jpg files)
- `game-audio` - For audio (.mp3 files)

---

## Step 2: Upload Your Assets

### Option A: Upload via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard:
   https://waltnbkjbmkrkkssikhr.supabase.co/project/default/storage/buckets

2. Click on each bucket and upload the corresponding files:

**game-models bucket:**
- rally-car.glb
- frailejon.glb
- pixel-bunny-3d.glb
- heart.gltf

**game-textures bucket:**
- asphalt.png
- grass.png
- sand.jpg
- sky.png
- wood.jpg
- pixel-bunny.png
- dream-nexus-logo.png

**game-audio bucket:**
- background.mp3
- hit.mp3
- success.mp3

### Option B: Upload via Script (if files are in client/public/)

If you place your real asset files in the `client/public/` directory with the correct folder structure, you can run:

```bash
npm run upload-assets
```

**Important:** This only works if you have the REAL files (not the 20-byte dummy placeholders) in your local `client/public/` directory.

---

## Step 3: Verify Assets Are Loading

Once uploaded, your game will automatically load assets from Supabase Storage URLs. The code has been updated to reference:

- `ASSETS.models.rallycar()` → Supabase CDN URL for rally-car.glb
- `ASSETS.textures.asphalt()` → Supabase CDN URL for asphalt.png
- `ASSETS.audio.background()` → Supabase CDN URL for background.mp3
- And so on...

---

## Why This Solution Works

**Before:** Files stored in `/tmp/cc-agent/.../project/client/public/` → **DELETED on session restart**

**After:** Files stored in Supabase Storage → **PERMANENT, accessible via CDN URLs**

Your assets will now persist forever, even when:
- Bolt restarts
- You close and reopen Bolt
- The container is recycled
- You switch between sessions

---

## Asset Management

To add new assets in the future:
1. Upload them via the Supabase Dashboard to the appropriate bucket
2. Update `client/src/lib/assets.ts` to add references to the new files
3. Use the ASSETS helper throughout your code

All assets are publicly accessible (no authentication required) which is perfect for a browser game.
