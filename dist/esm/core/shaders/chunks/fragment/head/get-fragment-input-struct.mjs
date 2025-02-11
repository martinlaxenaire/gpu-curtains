import { getVertexOutputStructContent } from '../../vertex/head/get-vertex-output-struct-content.mjs';

const getFragmentInputStruct = ({
  geometry,
  additionalVaryings = []
}) => {
  return (
    /* wgsl */
    `
struct FSInput {
  @builtin(front_facing) frontFacing: bool,
  ${getVertexOutputStructContent({ geometry, additionalVaryings })}
};`
  );
};

export { getFragmentInputStruct };
