import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  }
});
