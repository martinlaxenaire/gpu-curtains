import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'
import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'
import { getTextureSample } from './get-texture-sample'

/**
 * Set the `sheenRoughness` (`f32`) and `sheenColor` (`vec3f`) values from the material sheen variables and eventual sheen textures.
 * @param parameters - Parameters used to set the `sheenRoughness` (`f32`) and `sheenColor` (`vec3f`) values.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen is enabled.
 * @param parameters.sheenTexture - {@link ShaderTextureDescriptor | Sheen texture descriptor} (mixing both sheen color in the `RGB` channels and sheen roughness in the `A` channel) to use if any.
 * @param parameters.sheenColorTexture - {@link ShaderTextureDescriptor | Sheen color texture descriptor} (using the `RGB` channels) to use if any.
 * @param parameters.sheenRoughnessTexture - {@link ShaderTextureDescriptor | Sheen roughness texture descriptor} (using the `A` channel) to use if any.
 * @returns - String with the `sheenRoughness` (`f32`) and `sheenColor` (`vec3f`) values set.
 */
export const getSheen = ({
  extensionsUsed = [],
  sheenTexture = null,
  sheenColorTexture = null,
  sheenRoughnessTexture = null,
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
  sheenTexture?: ShaderTextureDescriptor
  sheenColorTexture?: ShaderTextureDescriptor
  sheenRoughnessTexture?: ShaderTextureDescriptor
} = {}): string => {
  let sheen = /* wgsl */ `
  var sheenSpecularDirect: vec3f = vec3(0.0);
  var sheenSpecularIndirect: vec3f = vec3(0.0);`

  if (!extensionsUsed.includes('KHR_materials_sheen')) {
    return sheen
  }

  if (sheenTexture) {
    sheen += getTextureSample(sheenTexture, 'sheen')
    sheen += /* wgsl */ `
  sheenColor = sheenColor * sheenSample.rgb;
  sheenRoughness = sheenRoughness * sheenSample.a;
    `
  } else {
    if (sheenColorTexture) {
      sheen += getTextureSample(sheenColorTexture, 'sheenColor')
      sheen += /* wgsl */ `
  sheenColor = sheenColor * sheenColorSample.rgb;
    `
    }

    if (sheenRoughnessTexture) {
      sheen += getTextureSample(sheenRoughnessTexture, 'sheenRoughness')
      sheen += /* wgsl */ `
  sheenRoughness = sheenRoughness * sheenRoughnessSample.a;
  `
    }
  }

  sheen += /* wgsl */ `
  sheenRoughness = clamp(sheenRoughness, 0.0001, 1.0);`

  return sheen
}
