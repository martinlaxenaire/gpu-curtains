const applyDirectionalShadows = (
  /* wgsl */
  `
    directLight.color *= directionalShadows[i];
`
);

export { applyDirectionalShadows };
