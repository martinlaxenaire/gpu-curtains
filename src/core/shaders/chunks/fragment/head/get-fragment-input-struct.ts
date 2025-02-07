import { Geometry } from '../../../../geometries/Geometry'
import { getVertexOutputStructContent } from '../../vertex/head/get-vertex-output-struct-content'
import { VertexShaderInputParams } from '../../../full/vertex/get-vertex-shader-code'

/**
 * Get the fragment shader WGSL input struct using {@link getVertexOutputStructContent}.
 * @param parameters - Parameters used to generate the fragment shader WGSL input struct.
 * @param parameters.geometry - {@link Geometry} used to generate the struct from its attributes.
 * @param parameters.additionalVaryings - Optional additional {@link VertexShaderInputParams.additionalVaryings | varyings} passed from the vertex shader to the fragment shader.
 * @returns - String with the fragment shader WGSL input struct.
 */
export const getFragmentInputStruct = ({
  geometry,
  additionalVaryings = [],
}: {
  geometry: Geometry
  additionalVaryings?: VertexShaderInputParams['additionalVaryings']
}): string => {
  return /* wgsl */ `
struct FSInput {
  @builtin(front_facing) frontFacing: bool,
  ${getVertexOutputStructContent({ geometry, additionalVaryings })}
};`
}
