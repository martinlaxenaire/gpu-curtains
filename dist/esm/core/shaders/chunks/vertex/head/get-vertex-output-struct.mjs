import { getVertexOutputStructContent } from './get-vertex-output-struct-content.mjs';

const getVertexOutputStruct = ({ geometry }) => {
  return (
    /* wgsl */
    `
struct VSOutput {
  ${getVertexOutputStructContent({ geometry })}
};`
  );
};

export { getVertexOutputStruct };
