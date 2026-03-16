import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const normalizedId = id.replace(/\\/g, '/');

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

          if (/node_modules\/(react|react-dom|scheduler)\//.test(normalizedId)) {
            return 'react-core';
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
