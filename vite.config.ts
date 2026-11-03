import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY || env.VITE_GOOGLE_MAPS_PLATFORM_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    build: {
      chunkSizeWarningLimit: 1600,
      target: 'esnext',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('motion')) return 'vendor-[#1E331B]-motion';
              if (id.includes('@supabase') || id.includes('supabase')) return 'vendor-supabase';
              if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
              if (id.includes('xlsx') || id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-[#1E331B]-export';
              return 'vendor-core';
            }
            if (id.includes('bjlBackgroundDataUri')) return 'asset-bg-data';
            if (id.includes('services/reportCalculations') || id.includes('services/dashboardCalculationService')) return 'engine-calculations';
          }
        }
      }
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/emails.json', '**/requests.log', '**/payload.json', '**/*.log', '**/create_mail_logs*']
      },
    },
  };
});
