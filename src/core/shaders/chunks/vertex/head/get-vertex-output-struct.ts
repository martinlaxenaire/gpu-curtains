import { Geometry } from '../../../../geometries/Geometry'
import { getVertexOutputStructContent } from './get-vertex-output-struct-content'

export const getVertexOutputStruct = ({ geometry }: { geometry: Geometry }): string => {
  return /* wgsl */ `
struct VSOutput {
  ${getVertexOutputStructContent({ geometry })}
};`
}
