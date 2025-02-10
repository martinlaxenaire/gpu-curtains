import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'
import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'

/**
 * Apply transmission volume refraction to `totalDiffuse` light component if applicable.
 * @param parameters - Parameters to use to apply transmission volume refraction.
 * @param parameters.transmissionBackgroundTexture - {@link ShaderTextureDescriptor | Transmission background texture descriptor} to use for transmission if any.
 * @param parameters.extensionsUsed - {@link types/gltf/GLTFExtensions.GLTFExtensionsUsed | glTF extensions used} by the material for specifing shading if any.
 * @returns - A string with transmission volume refraction applied to `totalDiffuse` light component.
 */
export const getIBLVolumeRefraction = ({
  transmissionBackgroundTexture = null,
  extensionsUsed = [],
}: {
  transmissionBackgroundTexture?: ShaderTextureDescriptor
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
}): string => {
  const hasDispersion = extensionsUsed.includes('KHR_materials_dispersion')
  const iblVolumeRefractionFunction = hasDispersion ? 'getIBLVolumeRefractionWithDispersion' : 'getIBLVolumeRefraction'

  return transmissionBackgroundTexture
    ? /* wgsl */ `
  var transmissionAlpha: f32 = 1.0;
  
  var transmitted: vec4f = ${iblVolumeRefractionFunction}(
    normal,
    normalize(viewDirection),
    roughness, 
    baseDiffuseColor,
    specularColor,
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
    ${transmissionBackgroundTexture.texture.options.name},
    ${transmissionBackgroundTexture.sampler.name},
  );
  
  transmissionAlpha = mix( transmissionAlpha, transmitted.a, transmission );
  
  totalDiffuse = mix(totalDiffuse, transmitted.rgb, transmission);
  outputColor.a *= transmissionAlpha;`
    : ''
}
