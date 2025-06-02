import { Geometry } from '../../../../geometries/Geometry'
import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'

/**
 * Set the `normal` (`vec3f`), `geometryNormal` (`vec3f`), and eventually `tangent` (`vec3f`) and `bitangent` (`vec3f`) values if a normal texture is set.
 *
 * Tangent and bitangent are calculated using derivatives if the {@link Geometry} `tangent` and `bitangent` attributes are missing.
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.geometry - {@link Geometry} to use to check for `tangent` and `bitangent` attributes.
 * @param parameters.normalTexture - {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any.
 * @returns - A string with the `normal` (`vec3f`), `geometryNormal` (`vec3f`), `tangent` (`vec3f`) and `bitangent` (`vec3f`) values set.
 */
export const getNormalTangentBitangent = ({
  geometry = null,
  normalTexture = null,
}: {
  geometry?: Geometry
  normalTexture?: ShaderTextureDescriptor
} = {}): string => {
  let normalTangentBitangent = /* wgsl */ `
  let faceDirection = select(-1.0, 1.0, frontFacing);
  let geometryNormal: vec3f = faceDirection * normal;`

  const tangentAttribute = geometry && geometry.getAttributeByName('tangent')
  const hasTangent = !!(normalTexture && tangentAttribute)

  if (normalTexture) {
    normalTangentBitangent += /* wgsl */ `
  var normalUV: vec2f = ${normalTexture.texCoordAttributeName ?? 'uv'};`

    if ('useTransform' in normalTexture.texture.options && normalTexture.texture.options.useTransform) {
      normalTangentBitangent += /* wgsl */ `
  normalUV = (texturesMatrices.${normalTexture.texture.options.name}.matrix * vec3(normalUV, 1.0)).xy;`
    }

    if (!hasTangent) {
      normalTangentBitangent += /* wgsl */ `
  bitangent = vec3(0.0, 1.0, 0.0);

  let NdotUp: f32 = dot(normal, vec3(0.0, 1.0, 0.0));
  
  if (1.0 - abs(NdotUp) <= EPSILON) {
    // Sampling +Y or -Y, so we need a more robust bitangent.
    if (NdotUp > 0.0) {
      bitangent = vec3(0.0, 0.0, 1.0);
    }
    else {
      bitangent = vec3(0.0, 0.0, -1.0);
    }
  }

  tangent = normalize(cross(bitangent, normal));
  bitangent = cross(normal, tangent);
  `
    }

    normalTangentBitangent += /* wgsl */ `
  let tbn = mat3x3f(tangent, bitangent, geometryNormal);
  let normalMap = textureSample(${normalTexture.texture.options.name}, ${
      normalTexture.sampler?.name ?? 'defaultSampler'
    }, normalUV).rgb;
  normal = normalize(tbn * (2.0 * normalMap - vec3(vec2(normalScale), 1.0)));`
  } else {
    normalTangentBitangent += /* wgsl */ `
  normal = geometryNormal;`
  }

  return normalTangentBitangent
}
