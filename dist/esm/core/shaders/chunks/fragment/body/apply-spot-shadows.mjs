const applySpotShadows = (
  /* wgsl */
  `
    directLight.color *= spotShadows[i];
`
);

export { applySpotShadows };
