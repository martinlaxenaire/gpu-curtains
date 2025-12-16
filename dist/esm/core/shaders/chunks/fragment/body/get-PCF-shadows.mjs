const getPCFShadows = (
  /* wgsl */
  `
  let pointShadows = getPCFPointShadows(worldPosition, fragmentPosition.xy);
  let directionalShadows = getPCFDirectionalShadows(worldPosition, fragmentPosition.xy);
  let spotShadows = getPCFSpotShadows(worldPosition, fragmentPosition.xy);
`
);

export { getPCFShadows };
