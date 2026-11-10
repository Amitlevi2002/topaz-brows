import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ../core holds the booking rules shared with the server
  server: { fs: { allow: ['..'] } },
});
