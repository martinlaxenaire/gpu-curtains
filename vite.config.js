export default {
  build: {
    // minify: false,
    // rollupOptions: {
    //   input: 'src/index.js',
    //   output: {
    //     dir: 'dist',
    //     entryFileNames: 'gpu-curtains.umd.js',
    //     format: 'umd',
    //     name: 'window',
    //   },
    // },
    lib: {
      entry: 'src',
      name: 'window',
      formats: ['umd'],
      filename: 'gpu-curtains',
    },
  },
}
