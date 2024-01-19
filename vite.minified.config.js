import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: true,
    lib: {
      entry: 'src',
      formats: ['es', 'umd'],
      fileName: 'gpu-curtains.min',
      name: 'GPUCurtains',
    },
    emptyOutDir: false,
    rollupOptions: {
      // input: 'src/index.js',
      // output: {
      //   dir: 'dist',
      //   entryFileNames: 'gpu-curtains.umd.js',
      //   format: 'umd',
      //   name: 'window',
      // },
    },
  },
})
