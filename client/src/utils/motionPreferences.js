export const motionPreferenceKey = android => android
  ? 'devflow-android-motion-paused'
  : 'devflow-motion-paused';

// Native scrolling takes priority by default. Keep the website's existing
// preference independent, and honor an explicit opt-in to Android animations.
export function readMotionPaused(storage, android) {
  try {
    const saved = storage.getItem(motionPreferenceKey(android));
    if (saved === 'true' || saved === 'false') return saved === 'true';
  } catch {
    // Blocked storage should not disable the native performance default.
  }
  return android;
}
