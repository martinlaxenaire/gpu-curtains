import { getVertexOutputStruct } from '../../chunks/vertex/head/get-vertex-output-struct.mjs';
import { getVertexOutput } from '../../chunks/vertex/body/get-vertex-output.mjs';
import { getVertexPositionNormal } from '../../chunks/vertex/body/get-vertex-position-normal.mjs';
import { declareAttributesVars } from '../../chunks/vertex/body/declare-attributes-vars.mjs';

const getVertexCode = ({ bindings = [], geometry }) => {
  return (
    /* wgsl */
    `
${getVertexOutputStruct({ geometry })}
  
@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;
    
  ${declareAttributesVars({ geometry })}
  ${getVertexPositionNormal({ bindings, geometry })}
  ${getVertexOutput({ geometry })}

  return vsOutput;
}`
  );
};

export { getVertexCode };
