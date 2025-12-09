import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'
import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'
import { ToneMappings } from '../../../../../types/shading'

/**
 * Apply transmission volume refraction to `totalDiffuse` light component if applicable.
 * @param parameters - Parameters to use to apply transmission volume refraction.
 * @param parameters.transmissionBackgroundTexture - {@link ShaderTextureDescriptor | Transmission background texture descriptor} to use for transmission if any.
 * @param parameters.transmissiveInputColorSpace - Whether the opaque objects sampled by the transmission texture have been drawn in `linear` or `srgb` color space. Default to `srgb`.
 * @param parameters.transmissiveInputToneMapping - The tone mapping applied to the opaque objects sampled by the transmission texture, if any. Default to `Khronos`.
 * @param parameters.extensionsUsed - {@link types/gltf/GLTFExtensions.GLTFExtensionsUsed | glTF extensions used} by the material for specifing shading if any.
 * @returns - A string with transmission volume refraction applied to `totalDiffuse` light component.
 */
export const getIBLVolumeRefraction = ({
  transmissionBackgroundTexture = null,
  transmissiveInputColorSpace = 'srgb',
  transmissiveInputToneMapping = 'Khronos',
  extensionsUsed = [],
}: {
  transmissionBackgroundTexture?: ShaderTextureDescriptor
  transmissiveInputColorSpace?: PBRFragmentShaderInputParams['transmissiveInputColorSpace']
  transmissiveInputToneMapping?: PBRFragmentShaderInputParams['transmissiveInputToneMapping']
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
}): string => {
  const hasDispersion = extensionsUsed.includes('KHR_materials_dispersion')
  const iblVolumeRefractionFunction = hasDispersion ? 'getIBLVolumeRefractionWithDispersion' : 'getIBLVolumeRefraction'

  const availableToneMappings: ToneMappings[] = [false, 'Khronos', 'Reinhard', 'Cineon']
  const transmissiveToneMapping = availableToneMappings.findIndex((t) => t === transmissiveInputToneMapping)

  return transmissionBackgroundTexture
    ? /* wgsl */ `
  var transmissionAlpha: f32 = 1.0;

  let isTransmissiveLinear: bool = ${transmissiveInputColorSpace === 'linear' ? 'true' : 'false'};
  let transmissiveToneMapping: u32 = ${transmissiveToneMapping};
  
  var transmitted: vec4f = ${iblVolumeRefractionFunction}(
    normal,
    viewDirection,
    roughness, 
    diffuseContribution,
    fab,
    specularColorBlended,
    specularF90,
    worldPosition,
    modelScale,
    camera.view,
    camera.projection,
    dispersion,
    ior,
    thickness,
    attenuationColor,
    attenuationDistance,
    isTransmissiveLinear,
    transmissiveToneMapping,
    ${transmissionBackgroundTexture.texture.options.name},
    ${transmissionBackgroundTexture.sampler.name},
  );
  
  transmissionAlpha = mix( transmissionAlpha, transmitted.a, transmission );
  
  totalDiffuse = mix(totalDiffuse, transmitted.rgb, transmission);
  outputColor.a *= transmissionAlpha;`
    : ''
}
