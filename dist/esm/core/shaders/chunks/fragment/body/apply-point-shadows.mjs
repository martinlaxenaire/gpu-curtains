//#region src/core/shaders/chunks/fragment/body/apply-point-shadows.ts
/** Helper chunk to apply a given {@link core/lights/PointLight.PointLight | PointLight} shadow to its light contribution. */
const applyPointShadows = `
    directLight.color *= pointShadows[i];
`;
//#endregion
export { applyPointShadows };
