import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'
import { getPBRSheenClearcoatDirect } from './get-PBR-sheen-clearcoat-direct'

export const getPBRDirectContribution = ({
  extensionsUsed = [],
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
} = {}): string => {
  let pbrDirect = ''

  if (extensionsUsed.includes('KHR_materials_anisotropy')) {
    pbrDirect += /* wgsl */ `
  getPBRDirect_Anisotropic(
    normal,
    baseDiffuseColor.rgb,
    viewDirection,
    specularF90,
    specularColor,
    metallic,
    roughness,
    iridescenceFresnel,
    iridescence,
    alphaT,
    anisotropyT,
    anisotropyB,
    directLight,
    &reflectedLight
  );`
  } else {
    pbrDirect += /* wgsl */ `
  getPBRDirect(
    normal,
    baseDiffuseColor.rgb,
    viewDirection,
    specularF90,
    specularColor,
    metallic,
    roughness,
    iridescenceFresnel,
    iridescence,
    directLight,
    &reflectedLight
  );`
  }

  // sheen + clearcoat
  pbrDirect += getPBRSheenClearcoatDirect({ extensionsUsed })

  return pbrDirect
}
