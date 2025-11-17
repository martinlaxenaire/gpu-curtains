import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the PBR direct light sheen and/or clearcoat contribution.
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen and/or clearcoat are enabled.
 * @returns - The PBR direct light sheen and/or clearcoat contributions.
 */
export const getPBRSheenClearcoatDirect = ({
  extensionsUsed = [],
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
} = {}): string => {
  let sheenClearcoatDirect = ''

  if (extensionsUsed.includes('KHR_materials_clearcoat')) {
    sheenClearcoatDirect += /* wgsl */ `
  clearcoatSpecularDirect += getPBRClearcoatDirect(clearcoatNormal, viewDirection, clearcoatF0, clearcoatF90, clearcoatRoughness, directLight, &reflectedLight);`
  }

  if (extensionsUsed.includes('KHR_materials_sheen')) {
    sheenClearcoatDirect += /* wgsl */ `
  sheenSpecularDirect += getPBRSheenDirect(normal, viewDirection, sheenColor, sheenRoughness, directLight, &reflectedLight);`
  }

  return sheenClearcoatDirect
}
