/** Helper chunk to apply a given {@link core/lights/PointLight.PointLight | PointLight} shadow to its light contribution. */
export const applyPointShadows: string = /* wgsl */ `
    directLight.color *= pointShadows[i];
`
