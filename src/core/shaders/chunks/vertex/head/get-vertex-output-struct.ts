import { Geometry } from '../../../../geometries/Geometry'
import { getVertexOutputStructContent } from './get-vertex-output-struct-content'
import { VertexShaderInputParams } from '../../../full/vertex/get-vertex-shader-code'

/**
 * Get the vertex shader WGSL output struct using {@link getVertexOutputStructContent}.
 * @param parameters - Parameters used to generate the vertex shader WGSL output struct.
 * @param parameters.geometry - {@link Geometry} used to generate the struct from its attributes.
 * @param parameters.additionalVaryings - Optional additional {@link VertexShaderInputParams.additionalVaryings | varyings} to pass from the vertex shader to the fragment shader.
 * @returns - String with the vertex shader WGSL output struct.
 */
export const getVertexOutputStruct = ({
  geometry,
  additionalVaryings = [],
}: {
  geometry: Geometry
  additionalVaryings?: VertexShaderInputParams['additionalVaryings']
}): string => {
  return /* wgsl */ `
struct VSOutput {
  ${getVertexOutputStructContent({ geometry, additionalVaryings })}
};`
}
