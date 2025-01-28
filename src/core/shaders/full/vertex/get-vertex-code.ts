import { getVertexOutputStruct } from '../../chunks/vertex/head/get-vertex-output-struct'
import { getVertexOutput } from '../../chunks/vertex/body/get-vertex-output'
import { getVertexPositionNormal } from '../../chunks/vertex/body/get-vertex-position-normal'
import { declareAttributesVars } from '../../chunks/vertex/body/declare-attributes-vars'
import { BufferBinding } from '../../../bindings/BufferBinding'
import { Geometry } from '../../../geometries/Geometry'

/** Defines the parameters used to create the vertex shader. */
export interface VertexShaderInputParams {
  /** Array of {@link BufferBinding} used to create the vertex shader. Typical {@link BufferBinding} used are `instances`, and the ones that include `morphTarget` or `skin` in their `name` properties. */
  bindings?: BufferBinding[]
  /** {@link Geometry} used to create the vertex shader. Will use the {@link Geometry#vertexBuffers | vertexBuffers} and {@link Geometry#instancesCount | instancesCount} properties. */
  geometry: Geometry
}

export const getVertexCode = ({ bindings = [], geometry }: VertexShaderInputParams): string => {
  return /* wgsl */ `
${getVertexOutputStruct({ geometry })}
  
@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;
    
  ${declareAttributesVars({ geometry })}
  ${getVertexPositionNormal({ bindings, geometry })}
  ${getVertexOutput({ geometry })}

  return vsOutput;
}`
}
