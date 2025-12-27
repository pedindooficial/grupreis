import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    https: process.env.NODE_ENV === 'development' ? {
      key: path.resolve(__dirname, '../certs/localhost-key.pem'),
      cert: path.resolve(__dirname, '../certs/localhost.pem'),
    } : undefined,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});

