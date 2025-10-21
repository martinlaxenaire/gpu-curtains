import { getUnlitFragmentShaderCode } from './get-unlit-fragment-shader-code.mjs';
import { getLambertFragmentShaderCode } from './get-lambert-fragment-shader-code.mjs';
import { getPhongFragmentShaderCode } from './get-phong-fragment-shader-code.mjs';
import { getPBRFragmentShaderCode } from './get-PBR-fragment-shader-code.mjs';

const getFragmentShaderCode = ({
  shadingModel = "PBR",
  outputColorSpace = "srgb",
  fragmentOutput = {
    struct: [
      {
        type: "vec4f",
        name: "color"
      }
    ],
    output: (
      /* wgsl */
      `
  var output: FSOutput;
  output.color = outputColor;
  return output;`
    )
  },
  chunks = null,
  toneMapping = "Khronos",
  geometry,
  additionalVaryings = [],
  materialUniform = null,
  materialUniformName = "material",
  extensionsUsed = [],
  receiveShadows = false,
  baseColorTexture = null,
  normalTexture = null,
  emissiveTexture = null,
  occlusionTexture = null,
  metallicRoughnessTexture = null,
  specularTexture = null,
  specularFactorTexture = null,
  specularColorTexture = null,
  transmissionTexture = null,
  thicknessTexture = null,
  transmissionBackgroundTexture = null,
  environmentMap = null
}) => {
  return (() => {
    switch (shadingModel) {
      case "Unlit":
        return getUnlitFragmentShaderCode({
          chunks,
          toneMapping,
          outputColorSpace,
          fragmentOutput,
          geometry,
          additionalVaryings,
          materialUniform,
          materialUniformName,
          baseColorTexture
        });
      case "Lambert":
        return getLambertFragmentShaderCode({
          chunks,
          toneMapping,
          outputColorSpace,
          fragmentOutput,
          geometry,
          additionalVaryings,
          materialUniform,
          materialUniformName,
          receiveShadows,
          baseColorTexture,
          normalTexture,
          emissiveTexture,
          occlusionTexture
        });
      case "Phong":
        return getPhongFragmentShaderCode({
          chunks,
          toneMapping,
          outputColorSpace,
          fragmentOutput,
          geometry,
          additionalVaryings,
          materialUniform,
          materialUniformName,
          receiveShadows,
          baseColorTexture,
          normalTexture,
          emissiveTexture,
          occlusionTexture,
          metallicRoughnessTexture,
          specularTexture,
          specularFactorTexture,
          specularColorTexture
        });
      case "PBR":
      default:
        return getPBRFragmentShaderCode({
          chunks,
          toneMapping,
          outputColorSpace,
          fragmentOutput,
          geometry,
          additionalVaryings,
          materialUniform,
          materialUniformName,
          extensionsUsed,
          receiveShadows,
          baseColorTexture,
          normalTexture,
          emissiveTexture,
          occlusionTexture,
          metallicRoughnessTexture,
          specularTexture,
          specularFactorTexture,
          specularColorTexture,
          transmissionTexture,
          thicknessTexture,
          transmissionBackgroundTexture,
          environmentMap
        });
    }
  })();
};

export { getFragmentShaderCode };
