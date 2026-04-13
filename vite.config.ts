import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  // When BASE_URL is set (GitHub Pages CI), use it as the asset base path.
  // Tauri dev/build uses the default '/'.
  base: process.env.BASE_URL ?? '/',
  server: {
    port: 5173,
    strictPort: true,
  },
});
