import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

export const getIBLClearCoatIndirectRadiance = ({
  extensionsUsed = [],
  environmentMap = null,
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
  environmentMap: PBRFragmentShaderInputParams['environmentMap']
}): string => {
  let iblClearcoatIndirectSpecular = ''

  if (extensionsUsed.includes('KHR_materials_clearcoat')) {
    iblClearcoatIndirectSpecular += /* wgsl */ `
  var clearcoatRadiance = vec3(0.0);
  `

    if (environmentMap) {
      iblClearcoatIndirectSpecular += /* wgsl */ `
  clearcoatRadiance += getIBLIndirectRadiance(
    clearcoatNormal,
    viewDirection,
    clearcoatRoughness,
    specularColor,
    specularIntensity,
    iBLGGXFresnel,
    ${environmentMap.sampler.name},
    ${environmentMap.specularTexture.options.name},
    envRotation,
    envSpecularIntensity,
  );`
    }
  }

  return iblClearcoatIndirectSpecular
}
