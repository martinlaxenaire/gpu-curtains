import { Geometry } from '../../../../geometries/Geometry'
import { ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the base color from the `material` binding `baseColorFactor` value, {@link Geometry} colors attributes if any and `baseColorTexture` if any, and apply it to our `outputColor`. Can also discard fragments based on `material` binding `alphaCutoff` value.
 * {@link https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#reference-material-pbrmetallicroughness | See glTF PBR metallic roughness} definition and default values.
 * @param parameters - Parameters to use to set the base color.
 * @param parameters.geometry - {@link Geometry} to use to check for colors attributes.
 * @param parameters.baseColorTexture - {@link ShaderTextureDescriptor | Base color texture descriptor} to use if any.
 * @returns - A string with base color applied to `outputColor`.
 */
export const getBaseColor = ({
  geometry = null,
  baseColorTexture = null,
}: {
  geometry?: Geometry
  baseColorTexture?: ShaderTextureDescriptor
} = {}): string => {
  let baseColor = /* wgsl */ `
  var baseColor: vec4f = vec4(baseColorFactor, baseOpacityFactor);
  `

  const colorAttributes = []
  if (geometry && geometry.vertexBuffers && geometry.vertexBuffers.length) {
    geometry.vertexBuffers.forEach((vertexBuffer) => {
      vertexBuffer.attributes.forEach((attribute) => {
        if (attribute.name.includes('color')) {
          colorAttributes.push(attribute)
        }
      })
    })
  }

  colorAttributes.forEach((colorAttribute) => {
    if (colorAttribute.type === 'vec3f') {
      baseColor += /* wgsl */ `
  baseColor *= vec4(fsInput.${colorAttribute.name}, 1.0);`
    } else {
      baseColor += /* wgsl */ `
  baseColor *= fsInput.${colorAttribute.name};`
    }
  })

  if (baseColorTexture) {
    baseColor += /* wgsl */ `
  let baseColorSample: vec4f = textureSample(${baseColorTexture.texture}, ${baseColorTexture.sampler}, ${baseColorTexture.texCoordAttributeName});
  baseColor *= baseColorSample;
  `
  }

  baseColor += /* wgsl */ `
  if (baseColor.a < alphaCutoff) {
    discard;
  }
  
  outputColor = baseColor;
  `

  return baseColor
}
