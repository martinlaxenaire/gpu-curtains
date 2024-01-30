import esbuild, { minify } from 'rollup-plugin-esbuild'

export default [
  {
    plugins: [esbuild()],
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/gpu-curtains.mjs',
        format: 'es',
        sourcemap: true,
      },
      {
        file: 'dist/gpu-curtains.umd.js',
        format: 'umd',
        name: 'window',
        extend: true,
        sourcemap: true,
      },
      {
        file: 'dist/gpu-curtains.umd.min.js',
        format: 'umd',
        name: 'window',
        extend: true,
        plugins: [minify()],
      },
    ],
  },
]
