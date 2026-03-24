//#region src/core/shaders/chunks/fragment/body/apply-directional-shadows.ts
/** Helper chunk to apply a given {@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight} shadow to its light contribution. */
const applyDirectionalShadows = `
    directLight.color *= directionalShadows[i];
`;
//#endregion
export { applyDirectionalShadows };
