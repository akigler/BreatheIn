# Free Soft Nature Sounds Guide

This guide helps you find free, soft nature sounds that match the images in your breathing app.

## Image to Sound Mapping

Each image type needs a matching soft ambient sound:

1. **Ocean** → Soft ocean waves, gentle sea sounds
2. **Forest** → Forest ambience with birds, peaceful nature sounds
3. **Ocean Waves** → Ocean waves, beach sounds
4. **Water** → Gentle water stream, flowing water
5. **Giraffes (Savanna)** → Nature ambience, soft savanna sounds
6. **Forest Path** → Forest ambience, nature sounds
7. **Lake** → Lake ambience, gentle water sounds
8. **Mountain Lake** → Lake ambience, peaceful water sounds

## Free Sound Sources

### 1. Mixkit (Recommended)
**URL:** https://mixkit.co/free-sound-effects/
**License:** Free for commercial use, no attribution required

**How to use:**
1. Visit https://mixkit.co/free-sound-effects/
2. Search for:
   - "ocean waves" or "sea waves"
   - "forest" or "forest birds"
   - "water stream" or "waterfall"
   - "nature ambience"
3. Click on a sound to preview
4. Click "Download Free SFX" to get the MP3
5. Host the file locally or on a CDN
6. Update the URL in `utils/constants.ts`

**Recommended searches:**
- Ocean: "ocean waves", "sea waves", "beach waves"
- Forest: "forest ambience", "forest birds", "nature sounds"
- Water: "water stream", "waterfall", "flowing water"
- Lake: "lake", "water ambience", "calm water"

### 2. Pixabay
**URL:** https://pixabay.com/music/
**License:** Free for commercial use (Pixabay License)

**How to use:**
1. Visit https://pixabay.com/music/
2. Search for nature sounds
3. Filter by "Free" and check license
4. Download MP3 files
5. Host locally or use direct download links (if available)

### 3. Freesound
**URL:** https://freesound.org/
**License:** Varies - look for CC0 (public domain) or CC BY (requires attribution)

**How to use:**
1. Visit https://freesound.org/
2. Search for nature sounds
3. **Filter by CC0 license** (no attribution needed)
4. Download MP3 or WAV files
5. Host locally

**Recommended CC0 searches:**
- "ocean waves cc0"
- "forest ambience cc0"
- "water stream cc0"

### 4. Chosic
**URL:** https://www.chosic.com/
**License:** CC0 (public domain)

**How to use:**
1. Visit https://www.chosic.com/
2. Search for nature sounds
3. Filter by CC0 license
4. Download MP3 files

## Implementation Options

### Option 1: Host Sounds Locally (Recommended for Production)
1. Download sounds from any source above
2. Create `assets/sounds/` directory
3. Place MP3 files in the directory
4. Update `NATURE_SOUNDS` in `utils/constants.ts`:
   ```typescript
   ocean: require('../assets/sounds/ocean-waves.mp3'),
   forest: require('../assets/sounds/forest-ambience.mp3'),
   // etc.
   ```

### Option 2: Use Direct URLs
1. Find sounds with direct download URLs
2. Update `NATURE_SOUNDS` in `utils/constants.ts` with the URLs
3. Note: URLs may break if the source removes files

### Option 3: Use a CDN
1. Upload sounds to a CDN (AWS S3, Cloudinary, etc.)
2. Update `NATURE_SOUNDS` with CDN URLs

## Sound Requirements

- **Format:** MP3 (preferred) or WAV
- **Length:** At least 30 seconds (will loop)
- **Quality:** 128kbps or higher
- **Volume:** Soft/calming (not too loud)
- **Loop:** Should loop seamlessly without noticeable breaks
- **Style:** Ambient, peaceful, non-distracting

## Quick Start

1. Go to https://mixkit.co/free-sound-effects/
2. Search for "ocean waves" and download a soft, loopable sound
3. Search for "forest ambience" and download
4. Search for "water stream" and download
5. Place files in `assets/sounds/` directory
6. Update `utils/constants.ts` with local file paths

## Testing

After adding sounds, test that:
- Each sound plays when its matching image is shown
- Sounds loop smoothly without breaks
- Volume is appropriate (soft, not jarring)
- Sounds match the mood of the images
