import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the clearcoat indirect radiance (specular) contribution as `clearcoatSpecularIndirect` (`vec3f`).
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if clearcoat is enabled.
 * @returns - String with the `clearcoatSpecularIndirect` (`vec3f`) value set.
 */
export const getClearcoatIndirectSpecular = ({
  extensionsUsed = [],
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
} = {}): string => {
  let clearcoatIndirect = ''

  if (extensionsUsed.includes('KHR_materials_clearcoat')) {
    clearcoatIndirect += /* wgsl */ `
  clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( clearcoatNormal, viewDirection, clearcoatF0, clearcoatF90, clearcoatRoughness );`
  }

  return clearcoatIndirect
}
