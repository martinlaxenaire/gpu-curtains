import { getVertexOutputStruct } from '../../chunks/vertex/head/get-vertex-output-struct.mjs';
import { getVertexOutput } from '../../chunks/vertex/body/get-vertex-output.mjs';
import { getVertexTransformedPositionNormal } from '../../chunks/vertex/body/get-vertex-transformed-position-normal.mjs';
import { declareAttributesVars } from '../../chunks/vertex/body/declare-attributes-vars.mjs';
import { patchAdditionalChunks } from '../../default-material-helpers.mjs';

const getVertexShaderCode = ({ bindings = [], geometry, chunks = null }) => {
  chunks = patchAdditionalChunks(chunks);
  return (
    /* wgsl */
    `
${chunks.additionalHead}
  
${getVertexOutputStruct({ geometry })}
  
@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;
    
  ${declareAttributesVars({ geometry })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  ${getVertexTransformedPositionNormal({ bindings, geometry })}
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${getVertexOutput({ geometry })}

  return vsOutput;
}`
  );
};

export { getVertexShaderCode };
