import { constants } from '../../chunks/utils/constants.mjs';
import { common } from '../../chunks/utils/common.mjs';
import { toneMappingUtils } from '../../chunks/utils/tone-mapping-utils.mjs';
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct.mjs';
import { declareAttributesVars } from '../../chunks/fragment/body/declare-attributes-vars.mjs';
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars.mjs';
import { getBaseColor } from '../../chunks/fragment/body/get-base-color.mjs';
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping.mjs';
import { patchAdditionalChunks } from '../../default-material-helpers.mjs';

const getUnlitFragmentShaderCode = ({
  chunks = null,
  toneMapping = "Linear",
  geometry,
  materialUniform = null,
  materialUniformName = "material",
  baseColorTexture = null
}) => {
  chunks = patchAdditionalChunks(chunks);
  return (
    /* wgsl */
    `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}

${getFragmentInputStruct({ geometry })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {       
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: "Unlit" })}
  ${getBaseColor({ geometry, baseColorTexture })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
  );
};

export { getUnlitFragmentShaderCode };
