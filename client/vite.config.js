import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2019',
    minify: 'terser',
    cssMinify: true,
    chunkSizeWarningLimit: 700,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('/react-dom/')) {
            return 'react-dom';
          }

          if (normalizedId.includes('/react/')) {
            return 'react';
          }

          if (normalizedId.includes('react-pdf') || normalizedId.includes('pdfjs') || normalizedId.includes('@react-pdf')) {
            return 'pdf';
          }

          if (normalizedId.includes('recharts') || normalizedId.includes('d3-')) {
            return 'charts';
          }

          if (normalizedId.includes('firebase')) {
            return 'firebase';
          }

          if (normalizedId.includes('framer-motion')) {
            return 'motion';
          }

          if (normalizedId.includes('react-router') || normalizedId.includes('history')) {
            return 'router';
          }

          if (normalizedId.includes('lucide-react')) {
            return 'icons';
          }

          if (normalizedId.includes('/axios/')) {
            return 'network';
          }

          return 'vendor-misc';
        },
      },
    },
  },
})
