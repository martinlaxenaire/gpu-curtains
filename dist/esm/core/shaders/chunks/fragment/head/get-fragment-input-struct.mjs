import { getVertexOutputStructContent } from '../../vertex/head/get-vertex-output-struct-content.mjs';

const getFragmentInputStruct = ({ geometry }) => {
  return (
    /* wgsl */
    `
struct FSInput {
  @builtin(front_facing) frontFacing: bool,
  ${getVertexOutputStructContent({ geometry })}
};`
  );
};

export { getFragmentInputStruct };
