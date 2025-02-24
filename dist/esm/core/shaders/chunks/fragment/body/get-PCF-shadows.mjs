const getPCFShadows = (
  /* wgsl */
  `
  let pointShadows = getPCFPointShadows(worldPosition);
  let directionalShadows = getPCFDirectionalShadows(worldPosition);
  let spotShadows = getPCFSpotShadows(worldPosition);
`
);

export { getPCFShadows };
