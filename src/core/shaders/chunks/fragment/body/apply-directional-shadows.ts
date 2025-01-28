/** Helper chunk to apply a given {@link DirectionalLight} shadow to its light contribution. */
export const applyDirectionalShadows: string = /* wgsl */ `
    directLight.color *= directionalShadows[i];
`
