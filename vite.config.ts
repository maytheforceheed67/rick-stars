import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths so dist/ can be hosted from any sub-path (GitHub Pages, itch.io, etc).
  base: './',
  build: {
    target: 'es2022',
    // Phaser alone is ~1.2 MB minified; that's expected for this game.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
