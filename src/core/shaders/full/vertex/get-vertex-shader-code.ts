import { getVertexOutputStruct } from '../../chunks/vertex/head/get-vertex-output-struct'
import { getVertexOutput } from '../../chunks/vertex/body/get-vertex-output'
import { getVertexTransformedPositionNormal } from '../../chunks/vertex/body/get-vertex-transformed-position-normal'
import { declareAttributesVars } from '../../chunks/vertex/body/declare-attributes-vars'
import { BufferBinding } from '../../../bindings/BufferBinding'
import { Geometry } from '../../../geometries/Geometry'
import { AdditionalChunks, patchAdditionalChunks } from '../../default-material-helpers'
import { VertexBufferAttribute } from '../../../../types/Geometries'

/** Defines the base parameters used to create the vertex shader. */
export interface VertexShaderInputBaseParams {
  /** Array of {@link BufferBinding} used to create the vertex shader. Typical {@link BufferBinding} used are `instances`, and the ones that include `morphTarget` or `skin` in their `name` properties. */
  bindings?: BufferBinding[]
  /** {@link Geometry} used to create the vertex shader. Will use the {@link Geometry#vertexBuffers | vertexBuffers} and {@link Geometry#instancesCount | instancesCount} properties. */
  geometry: Geometry
}

/** Defines the parameters used to create the vertex shader. */
export interface VertexShaderInputParams extends VertexShaderInputBaseParams {
  /** Additional WGSL chunks to add to the shader. */
  chunks?: AdditionalChunks
  /** Optional additional varyings to pass from the vertex shader to the fragment shader. */
  additionalVaryings?: Array<{
    /** {@link VertexBufferAttribute.type | type} of the varying. */
    type: VertexBufferAttribute['type']
    /** {@link VertexBufferAttribute.name | name} of the varying. */
    name: VertexBufferAttribute['name']
  }>
}

/**
 * Build a vertex shader based on the provided options, mostly used for lit meshes vertex shader code generation.
 * @param parameters - {@link VertexShaderInputParams} used to generate the vertex shader code.
 * @returns - The vertex shader generated based on the provided parameters.
 */
export const getVertexShaderCode = ({
  bindings = [],
  geometry,
  chunks = null,
  additionalVaryings = [],
}: VertexShaderInputParams): string => {
  // patch chunks
  chunks = patchAdditionalChunks(chunks)

  return /* wgsl */ `
${chunks.additionalHead}
  
${getVertexOutputStruct({ geometry, additionalVaryings })}
  
@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;
    
  ${declareAttributesVars({ geometry })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  ${getVertexTransformedPositionNormal({ bindings, geometry })}
  
  ${getVertexOutput({ geometry })}
  
  // user defined additional contribution
  ${chunks.additionalContribution}

  return vsOutput;
}`
}
