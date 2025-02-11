import { ToneMappings } from '../../../../../extras/meshes/LitMesh'

// Add more tone mappings? Handle exposure?

/**
 * Apply the corresponding tone mapping to our `outputColor` (`vec4f`).
 * @param parameters - Parameters to use for applying tone mapping.
 * @param parameters.toneMapping - {@link ToneMappings} to apply if any. Default to `'Khronos'`.
 */
export const applyToneMapping = ({ toneMapping = 'Khronos' }: { toneMapping?: ToneMappings } = {}) => {
  let toneMappingOutput = /* wgsl */ `
  let exposure: f32 = 1.0; // TODO
  outputColor *= exposure;
  `

  toneMappingOutput += (() => {
    switch (toneMapping) {
      case 'Khronos':
        return /* wgsl */ `
  outputColor = vec4(KhronosToneMapping(outputColor.rgb), outputColor.a);
  `
      case 'Reinhard':
        return `
  outputColor = vec4(ReinhardToneMapping(outputColor.rgb), outputColor.a);
        `
      case 'Cineon':
        return `
  outputColor = vec4(CineonToneMapping(outputColor.rgb), outputColor.a);
        `
      case false:
      default:
        return `
  outputColor = saturate(outputColor);
        `
    }
  })()

  toneMappingOutput += /* wgsl */ `
  outputColor = linearTosRGB_4(outputColor);
  `

  return toneMappingOutput
}
