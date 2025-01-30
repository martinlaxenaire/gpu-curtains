/** Helper chunk to apply a given {@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight} shadow to its light contribution. */
export const applyDirectionalShadows: string = /* wgsl */ `
    directLight.color *= directionalShadows[i];
`
