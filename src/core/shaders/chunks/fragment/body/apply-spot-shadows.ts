/** Helper chunk to apply a given {@link core/lights/SpotLight.SpotLight | SpotLight} shadow to its light contribution. */
export const applySpotShadows: string = /* wgsl */ `
    directLight.color *= spotShadows[i];
`
