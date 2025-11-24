import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the clearcoat indirect radiance (specular) contribution as `clearcoatSpecularIndirect` (`vec3f`).
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if clearcoat is enabled.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for GGX Fresnel if any.
 * @returns - String with the `clearcoatSpecularIndirect` (`vec3f`) value set.
 */
export const getClearcoatIndirectSpecular = ({
  extensionsUsed = [],
  environmentMap = null,
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
  environmentMap?: PBRFragmentShaderInputParams['environmentMap']
} = {}): string => {
  let clearcoatIndirect = ''

  if (extensionsUsed.includes('KHR_materials_clearcoat')) {
    if (environmentMap && environmentMap.lutTexture) {
      clearcoatIndirect += /* wgsl */ `
  let clearcoatFab: vec2f = DFGFromLUT(
    clearcoatNormal,
    viewDirection,
    clearcoatRoughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
  );`
    } else {
      clearcoatIndirect += /* wgsl */ `
  let clearcoatFab: vec2f = DFGApprox(clearcoatNormal, viewDirection, clearcoatRoughness);`
    }

    clearcoatIndirect += /* wgsl */ `
  let clearcoatBRDF: vec3f = clearcoatF0 * clearcoatFab.x + clearcoatF90 * clearcoatFab.y;
  clearcoatSpecularIndirect += clearcoatRadiance * clearcoatBRDF;`
  }

  return clearcoatIndirect
}
