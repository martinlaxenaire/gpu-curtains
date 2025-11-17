import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Set the sheen specular indirect contribution as `sheenSpecularIndirect` (`vec3f`).
 * @param parameters - Parameters used to set the `sheenSpecularIndirect` (`vec3f`) value.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen is enabled.
 * @returns - String with the `sheenSpecularIndirect` (`vec3f`) value set.
 */
export const getSheenIndirectSpecular = ({
  extensionsUsed = [],
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
} = {}): string => {
  let sheenIndirect = ''

  if (extensionsUsed.includes('KHR_materials_sheen')) {
    sheenIndirect += /* wgsl */ `
  sheenSpecularIndirect += getIBLSheenSpecularIndirect(normal, viewDirection, iblIrradiance, sheenColor, sheenRoughness);`
  }

  return sheenIndirect
}
