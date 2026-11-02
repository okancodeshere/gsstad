import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  plugins: [],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      // Ana proje + "Aparatlar" sayfası (sekmelerde gömülü anten askısı ve tava askısı sayfaları)
      input: {
        main: resolve(__dirname, 'index.html'),
        aparatlar: resolve(__dirname, 'aparatlar.html'),
        matsingAparat: resolve(__dirname, 'matsing_montaj_aparati.html'),
        tavaAski: resolve(__dirname, 'tava_aski_aparati.html')
      },
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  }
});
