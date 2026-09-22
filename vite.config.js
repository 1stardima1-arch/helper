import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { novaApiPlugin } from './src/api-plugin.js';

export default defineConfig({
  plugins: [react(), novaApiPlugin()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
