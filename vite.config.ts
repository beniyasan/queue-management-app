import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process': JSON.stringify({ env: { NODE_ENV: 'production' } }),
  },
  build: {
    target: 'es2018',
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
