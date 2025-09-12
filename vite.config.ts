import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'public/assets',
    emptyOutDir: false,
    lib: {
      entry: 'src/atlaskit-forms.tsx',
      name: 'FormsMount',
      formats: ['iife'],
      fileName: () => 'atlaskit-forms.iife.js',
    },
    rollupOptions: {
      output: {
        globals: {},
      },
    },
  },
});

