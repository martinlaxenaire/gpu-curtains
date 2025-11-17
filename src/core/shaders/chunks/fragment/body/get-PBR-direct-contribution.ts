import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'
import { getPBRSheenClearcoatDirect } from './get-PBR-sheen-clearcoat-direct'

/**
 * Get the PBR direct light contribution.
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if anisotropy is enabled.
 * @returns - The PBR direct light contribution, accounting for anisotropy, sheen and clearcoat contributions.
 */
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
