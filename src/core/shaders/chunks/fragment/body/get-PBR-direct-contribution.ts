import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the PBR direct light contribution.
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if anisotropy is enabled.
 * @returns - The PBR direct light contribution, accounting for anisotropy, sheen and clearcoat contributions.
 */
export const getPBRDirectContribution = ({
  extensionsUsed = [],
  environmentMap = null,
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
  environmentMap?: PBRFragmentShaderInputParams['environmentMap']
} = {}): string => {
  let pbrDirect = /* wgsl */ `
    let NdotL: f32 = saturate(dot(normal, directLight.direction));
    var irradiance: vec3f = NdotL * directLight.color;`

  // clearcoat
  if (extensionsUsed.includes('KHR_materials_clearcoat')) {
    pbrDirect += /* wgsl */ `
    clearcoatSpecularDirect += getPBRDirectClearcoat(clearcoatNormal, viewDirection, clearcoatF0, clearcoatF90, clearcoatRoughness, directLight);`
  }

  // sheen
  if (extensionsUsed.includes('KHR_materials_sheen')) {
    pbrDirect += /* wgsl */ `
    sheenSpecularDirect += irradiance * BRDF_Sheen(directLight.direction, viewDirection, normal, sheenColor, sheenRoughness);`

    if (environmentMap && environmentMap.lutTexture) {
      pbrDirect += /* wgsl */ `
    let sheenAlbedoV: f32 = getBRDFCharlie(
      normal,
      viewDirection,
      sheenRoughness,
      ${environmentMap.sampler.name},
      ${environmentMap.lutTexture.options.name}
    );
    
    let sheenAlbedoL: f32 = getBRDFCharlie(
      normal,
      directLight.direction,
      sheenRoughness,
      ${environmentMap.sampler.name},
      ${environmentMap.lutTexture.options.name}
    );`
    } else {
      pbrDirect += /* wgsl */ `
    let sheenAlbedoV: f32 = getSheenAlbedoScaleApprox(
      normal,
      viewDirection,
      sheenRoughness
    );
    
    let sheenAlbedoL: f32 = getSheenAlbedoScaleApprox(
      normal,
      directLight.direction,
      sheenRoughness
    );`
    }

    pbrDirect += /* wgsl */ `
    let sheenEnergyComp: f32 = 1.0 - max3( sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 		irradiance *= sheenEnergyComp;`
  }

  if (environmentMap && environmentMap.lutTexture) {
    pbrDirect += /* wgsl */ `
    // Precomputed DFG values for view and light directions from LUT
    let dfgDirect: DFGDirect = DFGDirectFromLUT(
      normal,
      viewDirection,
      directLight.direction,
      roughness,
      ${environmentMap.sampler.name},
      ${environmentMap.lutTexture.options.name},
    );
    `
  } else {
    // if the environment map hasn't created a LUT texture
    pbrDirect += /* wgsl */ `
    // Precomputed DFG values for view and light directions from approximation
    let dfgDirect: DFGDirect = DFGDirectApprox(
      normal,
      viewDirection,
      directLight.direction,
      roughness,
    );
    `
  }

  if (extensionsUsed.includes('KHR_materials_anisotropy')) {
    pbrDirect += /* wgsl */ `
    var lightContribution: LightContribution = getPBRDirectAnisotropic(
      normal,
      viewDirection,
      NdotL,
      irradiance,
      dfgDirect,
      diffuseContribution,
      specularF90,
      specularColorBlended,
      roughness,
      iridescenceFresnel,
      iridescence,
      alphaT,
      anisotropyT,
      anisotropyB,
      directLight
    );`
  } else {
    pbrDirect += /* wgsl */ `
    var lightContribution: LightContribution = getPBRDirect(
      normal,
      viewDirection,
      NdotL,
      irradiance,
      dfgDirect,
      diffuseContribution,
      specularF90,
      specularColorBlended,
      roughness,
      iridescenceFresnel,
      iridescence,
      directLight
    );`
  }

  if (extensionsUsed.includes('KHR_materials_diffuse_transmission')) {
    pbrDirect += /* wgsl */ `
    lightContribution.diffuse = lightContribution.diffuse * (1.0 - diffuseTransmission);
    let diffuseNdotL: f32 = saturate(dot(-1.0 * normal, directLight.direction));
    var lightDiffuseTransmission: vec3f = directLight.color * diffuseNdotL * BRDF_Lambert(diffuseTransmissionContribution);`

    if (extensionsUsed.includes('KHR_materials_volume')) {
      pbrDirect += /* wgsl */ `
    lightDiffuseTransmission *= volumeAttenuation(diffuseTransmissionThickness, attenuationColor, attenuationDistance);
    `
    }

    pbrDirect += /* wgsl */ `
    // lightDiffuseTransmission *= 1.0 - singleVolumeScatter;
    lightDiffuseTransmission *= singleVolumeScatter;
    lightContribution.diffuse += lightDiffuseTransmission * diffuseTransmission;
    `
  }

  pbrDirect += /* wgsl */ `
    reflectedLight.directDiffuse += lightContribution.diffuse;
    reflectedLight.directSpecular += lightContribution.specular;
  `

  return pbrDirect
}
