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
  let sheenIndirect = ''

  if (extensionsUsed.includes('KHR_materials_sheen')) {
    // TODO
    // we'd need a Charlie cubemap to sample from using sheenRoughness
    // for now we'll just approximate with the PMREM
    if (environmentMap && environmentMap.lutTexture) {
      sheenIndirect += /* wgsl */ `
  // remap sheen roughness so we get only high mips
  // to sample from in the PMREM (helps approximate Charlie cubemap convolutions)
  // let remappedSheenRoughness = 0.2 + sheenRoughness * 0.8;
  let remappedSheenRoughness = saturate(0.2 + sheenRoughness);
  var sheenIblIrradiance: vec3f = getIBLIndirectRadiance(
    normal,
    viewDirection,
    remappedSheenRoughness,
    ${environmentMap.sampler.name},
    ${environmentMap.specularTexture.options.name},
    envRotation,
    envSpecularIntensity,
  );

  let sheenBRDFCharlie: f32 = getBRDFCharlie(
    normal,
    viewDirection,
    sheenRoughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name}
  );

  sheenSpecularIndirect += sheenIblIrradiance * sheenColor * sheenBRDFCharlie;
  let sheenAlbedoScale: f32 = sheenBRDFCharlie;`
    } else {
      sheenIndirect += /* wgsl */ `
  let sheenBRDFCharlie: f32 = getBRDFCharlieApprox(normal, viewDirection, sheenRoughness);

  sheenSpecularIndirect += irradiance * sheenColor * sheenBRDFCharlie;
  // we could also use 0.157 as approximation
  let sheenAlbedoScale: f32 = getSheenAlbedoScaleApprox(normal, viewDirection, sheenRoughness);`
    }
  }

  return sheenIndirect
}
