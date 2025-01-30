import { ToneMappings } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Apply the corresponding tone mapping to our `outputColor` (`vec4f`).
 * @param parameters - Parameters to use for applying tone mapping.
 * @param parameters.toneMapping - {@link ToneMappings} to apply if any. Default to `'Linear'`.
 */
export const applyToneMapping = ({ toneMapping = 'Linear' }: { toneMapping?: ToneMappings } = {}) => {
  return (() => {
    switch (toneMapping) {
      case 'Linear':
        return 'outputColor = vec4(linearToOutput3(outputColor.rgb), outputColor.a);'
      case 'Khronos':
        return 'outputColor = vec4(linearTosRGB(toneMapKhronosPbrNeutral(outputColor.rgb)), outputColor.a);'
      case false:
      default:
        return ''
    }
  })()
}
