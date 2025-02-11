import { BufferBinding } from '../../../../bindings/BufferBinding'
import { getMorphTargets } from './get-morph-targets'
import { getVertexSkinnedPositionNormal } from './get-vertex-skinned-position-normal'
import { VertexShaderInputBaseParams } from '../../../full/vertex/get-vertex-shader-code'

/**
 * Generate the part of the vertex shader dedicated to compute the output transformed `worldPosition` and `normal` vectors. Account for instancing (using a {@link BufferBinding} with `instances` name if any), morph targets and skinning using the provided {@link core/geometries/Geometry.Geometry | Geometry} and {@link BufferBinding} array parameters.
 *
 * Used internally by the various {@link core/shadows/Shadow.Shadow | Shadow} classes and the {@link extras/gltf/GLTFScenesManager | GLTFScenesManager} class.
 *
 * @param parameters - {@link VertexShaderInputBaseParams} used to compute the output transformed `worldPosition` and `normal` vectors.
 * @returns - The part of the vertex shader dedicated to computing the output transformed `worldPosition` and `normal` vectors.
 */
export const getVertexTransformedPositionNormal = ({
  bindings = [],
  geometry,
}: VertexShaderInputBaseParams): string => {
  let output = ''

  // morph targets
  output += getMorphTargets({ bindings, geometry })

  output += /* wgsl */ `
  var worldPosition: vec4f = vec4(position, 1.0);
  `

  // skins
  output += getVertexSkinnedPositionNormal({ bindings, geometry })

  return output
}
