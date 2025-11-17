import { getPBRSheenClearcoatDirect } from './get-PBR-sheen-clearcoat-direct.mjs';

const getPBRDirectContribution = ({
  extensionsUsed = []
} = {}) => {
  let pbrDirect = "";
  if (extensionsUsed.includes("KHR_materials_anisotropy")) {
    pbrDirect += /* wgsl */
    `
    getPBRDirect_Anisotropic(
      normal,
      baseDiffuseColor.rgb,
      viewDirection,
      specularF90,
      specularColor,
      roughness,
      iridescenceFresnel,
      iridescence,
      alphaT,
      anisotropyT,
      anisotropyB,
      directLight,
      &reflectedLight
    );`;
  } else {
    pbrDirect += /* wgsl */
    `
    getPBRDirect(
      normal,
      baseDiffuseColor.rgb,
      viewDirection,
      specularF90,
      specularColor,
      roughness,
      iridescenceFresnel,
      iridescence,
      directLight,
      &reflectedLight
    );`;
  }
  pbrDirect += getPBRSheenClearcoatDirect({ extensionsUsed });
  return pbrDirect;
};

export { getPBRDirectContribution };
