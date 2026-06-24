import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Bryntum packages are large and can get stale in Vite's pre-bundle cache,
    // causing "Outdated Optimize Dep" 504 errors during lazy route loads.
    exclude: ['@bryntum/calendar-react', '@bryntum/calendar'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('agora-rtc-sdk-ng') || id.includes('agora-rtm-sdk')) return 'agora';
          if (id.includes('@bryntum/calendar') || id.includes('@bryntum/calendar-react')) return 'bryntum-calendar';
          if (id.includes('@elevenlabs/react') || id.includes('@google/genai') || id.includes('@google/generative-ai')) return 'ai-assistant';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('socket.io-client')) return 'realtime';
          if (id.includes('axios')) return 'http';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-router') || id.includes('@remix-run/router')) return 'router';
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';

          return 'vendor';
        },
      },
    },
  },
})
