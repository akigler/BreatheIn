export const BREATHING_DURATIONS = {
  INHALE: 4000, // 4 seconds
  HOLD_AFTER_INHALE: 1000, // 1 second hold at max size
  EXHALE: 4000, // 4 seconds
  HOLD_AFTER_EXHALE: 1000, // 1 second hold at min size
  TOTAL_CYCLE: 10000, // 10 seconds total (4 + 1 + 4 + 1)
};

// Session durations in seconds: 15s, 30s, 1min, 2min, ... 59min, 1hr
export const SESSION_DURATIONS = [
  15, // 15 seconds
  30, // 30 seconds
  ...Array.from({ length: 58 }, (_, i) => (i + 1) * 60), // 1 min to 58 min
  59 * 60, // 59 minutes
  60 * 60, // 1 hour
];

// Helper function to format duration for display
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} sec`;
  } else if (seconds < 3600) {
    const minutes = seconds / 60;
    return `${minutes} min`;
  } else {
    const hours = seconds / 3600;
    return `${hours} hr`;
  }
};

// Helper function to convert seconds to minutes (for session store)
export const secondsToMinutes = (seconds: number): number => {
  return seconds / 60;
};

export const BREATHING_SCALE = {
  MIN: 0.8,
  MAX: 1.2,
};

export const BREATHING_OPACITY = {
  MIN: 0.85,
  MAX: 0.9,
};

// Nature images with their corresponding soft ambient sounds
// All sounds are free to use (Mixkit License - free for commercial use)
export const NATURE_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    type: 'ocean',
    description: 'Ocean',
  },
  {
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    type: 'forest',
    description: 'Forest',
  },
  {
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&q=80',
    type: 'ocean-waves',
    description: 'Ocean waves',
  },
  {
    url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80',
    type: 'water',
    description: 'Water',
  },
  {
    url: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80',
    type: 'savanna',
    description: 'Giraffes',
  },
  {
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
    type: 'forest-path',
    description: 'Forest path',
  },
  {
    url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&q=80',
    type: 'lake',
    description: 'Lake',
  },
  {
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
    type: 'mountain-lake',
    description: 'Mountain lake',
  },
] as const;

// Free soft nature sounds - all sounds are soft ambient nature sounds
// 
// SOURCES FOR FREE SOUNDS:
// 1. Mixkit (https://mixkit.co/free-sound-effects/) - Free for commercial use
//    - Ocean: Search "ocean waves" or "sea waves"
//    - Forest: Search "forest ambience" or "forest birds"
//    - Water: Search "water stream" or "waterfall"
// 
// 2. Pixabay (https://pixabay.com/music/) - Free for commercial use
//    - Search for "ocean waves", "forest ambient", "water stream", etc.
// 
// 3. Freesound (https://freesound.org/) - Filter by CC0 license
//    - Search and filter by CC0 (public domain) license
// 
// 4. Chosic (https://www.chosic.com/) - CC0 sounds available
//
// NOTE: For production, download these sounds and host them locally or use a CDN
// The URLs below are placeholders - replace with actual working URLs or local file paths
// Example local path: require('../assets/sounds/ocean-waves.mp3')

// Using local sound file for now - will add more sounds later
const birdsSound = require('../assets/sounds/birds1.mp3');

export const NATURE_SOUNDS: Record<string, string | number> = {
  // Ocean sounds - gentle waves (soft, calming)
  // Using birds1.mp3 for now - will add more sounds later
  ocean: birdsSound,
  'ocean-waves': birdsSound,
  
  // Forest sounds - ambient forest with birds (soft, peaceful)
  // Using birds1.mp3 for now - will add more sounds later
  forest: birdsSound,
  'forest-path': birdsSound,
  
  // Water sounds - gentle stream/waterfall (soft, flowing)
  // Using birds1.mp3 for now - will add more sounds later
  water: birdsSound,
  lake: birdsSound,
  'mountain-lake': birdsSound,
  
  // Savanna/nature ambient (soft, natural)
  // Using birds1.mp3 for now - will add more sounds later
  savanna: birdsSound,
};

// Helper function to get sound source for an image URL
// Returns either a number (require() result) or string (URL)
export const getSoundForImage = (imageUrl: string): string | number => {
  const image = NATURE_IMAGES.find(img => img.url === imageUrl);
  if (image) {
    return NATURE_SOUNDS[image.type] || NATURE_SOUNDS.ocean; // Default to ocean if not found
  }
  return NATURE_SOUNDS.ocean; // Default fallback
};
