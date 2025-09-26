import { FragmentOutput } from '../../../../../types/shading'

/**
 * Get the fragment shader WGSL struct content from the given {@link FragmentOutput.struct | FragmentOutput struct}.
 * @param parameters - Parameters used to generate the fragment shader WGSL output struct.
 * @param parameters.struct - Structure parameters as an array of `type` and `name` members used to generate the fragment shader WGSL struct. Default to `[{ type: 'vec4f', name: 'color }]`.
 * @returns - String with the fragment shader WGSL output struct.
 */
export const getFragmentOutputStruct = ({
  struct = [
    {
      type: 'vec4f',
      name: 'color',
    },
  ],
}: {
  struct?: FragmentOutput['struct']
}): string => {
  const outputStructContent = struct
    .map((s, i) => {
      return /* wgsl */ `
  @location(${i}) ${s.name}: ${s.type},`
    })
    .join('')

  return /* wgsl */ `struct FSOutput {${outputStructContent}
}`
}
