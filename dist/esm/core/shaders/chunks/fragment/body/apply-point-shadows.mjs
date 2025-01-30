const applyPointShadows = (
  /* wgsl */
  `
    directLight.color *= pointShadows[i];
`
);

export { applyPointShadows };
