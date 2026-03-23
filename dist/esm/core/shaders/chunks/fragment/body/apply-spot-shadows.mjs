//#region src/core/shaders/chunks/fragment/body/apply-spot-shadows.ts
/** Helper chunk to apply a given {@link core/lights/SpotLight.SpotLight | SpotLight} shadow to its light contribution. */
const applySpotShadows = `
    directLight.color *= spotShadows[i];
`;
//#endregion
export { applySpotShadows };
