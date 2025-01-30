import { Geometry } from '../../../../geometries/Geometry'
import { getVertexOutputStructContent } from './get-vertex-output-struct-content'

/**
 * Get the vertex shader WGSL output struct using {@link getVertexOutputStructContent}.
 * @param parameters - Parameters used to generate the vertex shader WGSL output struct.
 * @param parameters.geometry - {@link Geometry} used to generate the struct from its attributes.
 * @returns - String with the vertex shader WGSL output struct.
 */
export const getVertexOutputStruct = ({ geometry }: { geometry: Geometry }): string => {
  return /* wgsl */ `
struct VSOutput {
  ${getVertexOutputStructContent({ geometry })}
};`
}
