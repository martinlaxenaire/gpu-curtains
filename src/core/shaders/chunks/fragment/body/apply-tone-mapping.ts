import { ToneMappings } from '../../../full/fragment/get-fragment-code'

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
