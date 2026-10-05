import { constants } from "../../chunks/utils/constants.mjs";
import { common } from "../../chunks/utils/common.mjs";
import { toneMappingUtils } from "../../chunks/utils/tone-mapping-utils.mjs";
//#region src/core/shaders/full/fragment/output-fragment-shader-code.ts
/**
* Fragment shader used by the renderer output pass. Used for exposure, tone mapping and color space conversion.
*/
const outputFragmentShaderCode = `
${constants}
${common}
${toneMappingUtils}

fn applyToneMapping(color: vec4f, mode: u32) -> vec4f {
  switch mode {
    case 1: {
      return vec4(KhronosToneMapping(color.rgb), color.a);
    }
    case 2: {
      return vec4(ReinhardToneMapping(color.rgb), color.a);
    }
    case 3: {
      return vec4(CineonToneMapping(color.rgb), color.a);
    }
    default: {
      return saturate(color);
    }
  }
}

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  var outputColor = textureSample(renderTexture, defaultSampler, fsInput.uv);

  // exposure
  outputColor.rgb *= output.exposure;

  // tone mapping
  outputColor = applyToneMapping(outputColor, output.toneMapping);

  // color space
  if(output.colorSpace == 1) {
    outputColor = linearTosRGB_4(outputColor);
  }

  return outputColor;
}`;
//#endregion
export { outputFragmentShaderCode };
