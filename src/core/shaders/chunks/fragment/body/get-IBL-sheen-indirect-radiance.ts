import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Set the sheen specular indirect contribution as `sheenSpecularIndirect` (`vec3f`).
 * @param parameters - Parameters used to set the `sheenSpecularIndirect` (`vec3f`) value.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen is enabled.
 * @returns - String with the `sheenSpecularIndirect` (`vec3f`) value set.
 */
export const getIBLSheenIndirectRadiance = ({
  extensionsUsed = [],
  environmentMap = null,
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
  environmentMap?: PBRFragmentShaderInputParams['environmentMap']
} = {}): string => {
  let sheenIndirect = /* wgsl */ `
  var sheenEnergyComp: f32 = 1.0;`

  if (extensionsUsed.includes('KHR_materials_sheen')) {
    // TODO
    // we'd need a Charlie cubemap to sample from using sheenRoughness?
    // for now we'll just use the IBL irradiance/diffuse
    if (environmentMap && environmentMap.lutTexture) {
      sheenIndirect += /* wgsl */ `
  let sheenBRDFCharlie: f32 = getBRDFCharlie(
    normal,
    viewDirection,
    sheenRoughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name}
  );

  sheenSpecularIndirect += iblIrradiance * sheenColor * sheenBRDFCharlie;
  let sheenAlbedoScale: f32 = sheenBRDFCharlie;`
    } else {
      sheenIndirect += /* wgsl */ `
  let sheenBRDFCharlie: f32 = getBRDFCharlieApprox(normal, viewDirection, sheenRoughness);

  sheenSpecularIndirect += iblIrradiance * sheenColor * sheenBRDFCharlie;
  // we could also use 0.157 as approximation
  let sheenAlbedoScale: f32 = getSheenAlbedoScaleApprox(normal, viewDirection, sheenRoughness);`
    }

    sheenIndirect += /* wgsl */ `
  sheenEnergyComp = 1.0 - max3(sheenColor) * sheenAlbedoScale;`
  }

  return sheenIndirect
}
