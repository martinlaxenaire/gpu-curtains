import { Geometry } from '../../../../geometries/Geometry'
import { getVertexOutputStructContent } from '../../vertex/head/get-vertex-output-struct-content'

/**
 * Get the fragment shader WGSL input struct using {@link getVertexOutputStructContent}.
 * @param parameters - Parameters used to generate the fragment shader WGSL input struct.
 * @param parameters.geometry - {@link Geometry} used to generate the struct from its attributes.
 * @returns - String with the fragment shader WGSL input struct.
 */
export const getFragmentInputStruct = ({ geometry }: { geometry: Geometry }): string => {
  return /* wgsl */ `
struct FSInput {
  @builtin(front_facing) frontFacing: bool,
  ${getVertexOutputStructContent({ geometry })}
};`
}
