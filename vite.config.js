import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: 'src',
      formats: ['es', 'umd'],
      filename: 'gpu-curtains',
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
      output: {
        footer: '/*  test **/',
      },
    },
  },
})