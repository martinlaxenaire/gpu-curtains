import esbuild, { minify } from 'rollup-plugin-esbuild'

export default [
  {
    plugins: [esbuild()],
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/gpu-curtains.mjs',
        format: 'es',
        sourcemap: 'inline',
      },
      {
        file: 'dist/gpu-curtains.umd.cjs',
        format: 'umd',
        name: 'window',
        extend: true,
        sourcemap: 'inline',
      },
      {
        file: 'dist/gpu-curtains.umd.min.cjs',
        format: 'umd',
        name: 'window',
        extend: true,
        plugins: [minify()],
      },
    ],
  },
]
