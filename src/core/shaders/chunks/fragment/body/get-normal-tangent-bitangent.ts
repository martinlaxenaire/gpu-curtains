import { Geometry } from '../../../../geometries/Geometry'
import { ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-shader-code'

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
    if (!hasTangent) {
      normalTangentBitangent += /* wgsl */ `
  // TODO decide whether we're computing tangent and bitangent
  // with normal or with derivatives
  /*
  let Q1: vec3f = dpdx(worldPosition);
  let Q2: vec3f = dpdy(worldPosition);
  let st1: vec2f = dpdx(fsInput.${normalTexture.texCoordAttributeName ?? 'uv'});
  let st2: vec2f = dpdy(fsInput.${normalTexture.texCoordAttributeName ?? 'uv'});
  
  tangent = normalize(Q1 * st2.y - Q2 * st1.y);
  bitangent = normalize(-Q1 * st2.x + Q2 * st1.x);
  */
  
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
    }, ${normalTexture.texCoordAttributeName ?? 'uv'}).rgb;
  normal = normalize(tbn * (2.0 * normalMap - vec3(normalMapScale, normalMapScale, 1.0)));`
  } else {
    normalTangentBitangent += /* wgsl */ `
  normal = geometryNormal;`
  }

  return normalTangentBitangent
}
