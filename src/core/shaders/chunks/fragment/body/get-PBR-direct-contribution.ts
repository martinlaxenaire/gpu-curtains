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
  let pbrDirect = ''

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
    getPBRDirectAnisotropic(
      normal,
      viewDirection,
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
      directLight,
      &reflectedLight
    );`
  } else {
    pbrDirect += /* wgsl */ `
    getPBRDirect(
      normal,
      viewDirection,
      dfgDirect,
      diffuseContribution,
      specularF90,
      specularColorBlended,
      roughness,
      iridescenceFresnel,
      iridescence,
      directLight,
      &reflectedLight
    );`
  }

  // clearcoat
  if (extensionsUsed.includes('KHR_materials_clearcoat')) {
    pbrDirect += /* wgsl */ `
    clearcoatSpecularDirect += getPBRDirectClearcoat(clearcoatNormal, viewDirection, clearcoatF0, clearcoatF90, clearcoatRoughness, directLight, &reflectedLight);`
  }

  // sheen
  if (extensionsUsed.includes('KHR_materials_sheen')) {
    pbrDirect += /* wgsl */ `
    sheenSpecularDirect += getPBRDirectSheen(normal, viewDirection, sheenColor, sheenRoughness, directLight, &reflectedLight);`
  }

  return pbrDirect
}
