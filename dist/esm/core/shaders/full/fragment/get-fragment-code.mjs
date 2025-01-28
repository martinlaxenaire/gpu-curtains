import { getUnlitFragmentCode } from './get-unlit-fragment-code.mjs';
import { getLambertFragmentCode } from './get-lambert-fragment-code.mjs';
import { getPhongFragmentCode } from './get-phong-fragment-code.mjs';
import { getPBRFragmentCode } from './get-pbr-fragment-code.mjs';

const getFragmentCode = ({
  shadingModel = "PBR",
  chunks = {
    additionalFragmentHead: "",
    preliminaryColorContribution: "",
    additionalColorContribution: ""
  },
  toneMapping = "Linear",
  geometry,
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
  if (!chunks) {
    chunks = {
      additionalFragmentHead: "",
      preliminaryColorContribution: "",
      additionalColorContribution: ""
    };
  } else {
    if (!chunks.additionalFragmentHead) {
      chunks.additionalFragmentHead = "";
    }
    if (!chunks.preliminaryColorContribution) {
      chunks.preliminaryColorContribution = "";
    }
    if (!chunks.additionalColorContribution) {
      chunks.additionalColorContribution = "";
    }
  }
  return (() => {
    switch (shadingModel) {
      case "Unlit":
        return getUnlitFragmentCode({ chunks, toneMapping, geometry, baseColorTexture });
      case "Lambert":
        return getLambertFragmentCode({
          chunks,
          toneMapping,
          geometry,
          receiveShadows,
          baseColorTexture,
          normalTexture,
          emissiveTexture,
          occlusionTexture
        });
      case "Phong":
        return getPhongFragmentCode({
          chunks,
          toneMapping,
          geometry,
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
        return getPBRFragmentCode({
          chunks,
          toneMapping,
          geometry,
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

export { getFragmentCode };
