import { Geometry } from '../../../../geometries/Geometry'
import { getVertexOutputStructContent } from '../../vertex/head/get-vertex-output-struct-content'

export const getFragmentInputStruct = ({ geometry }: { geometry: Geometry }): string => {
  return /* wgsl */ `
struct FSInput {
  @builtin(front_facing) frontFacing: bool,
  ${getVertexOutputStructContent({ geometry })}
};`
}
