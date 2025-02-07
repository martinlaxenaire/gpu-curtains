import { getVertexOutputStructContent } from './get-vertex-output-struct-content.mjs';

const getVertexOutputStruct = ({
  geometry,
  additionalVaryings = []
}) => {
  return (
    /* wgsl */
    `
struct VSOutput {
  ${getVertexOutputStructContent({ geometry, additionalVaryings })}
};`
  );
};

export { getVertexOutputStruct };
