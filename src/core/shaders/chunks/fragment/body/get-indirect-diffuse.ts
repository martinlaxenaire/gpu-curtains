import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get Render Equations for indirect diffuse contribution, accounting for sheen energy compensation if needed.
 *
 * @param parameters - Parameters used to set the indirect diffuse contribution.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen is enabled.
 * @returns - Correct Render Equations function.
 */
export const getIndirectDiffuse = ({
  extensionsUsed = [],
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
}): string => {
  let indirectDiffuse = ''

  if (extensionsUsed.includes('KHR_materials_sheen')) {
    indirectDiffuse += /* wgsl */ `
  RE_IndirectDiffuseSheen(irradiance, diffuseContribution, sheenEnergyComp, &reflectedLight);`
  } else {
    indirectDiffuse += /* wgsl */ `
  RE_IndirectDiffuse(irradiance, diffuseContribution, &reflectedLight);`
  }

  return indirectDiffuse
}
