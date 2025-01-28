const getPCFShadows = (
  /* wgsl */
  `
  let pointShadows = getPCFPointShadows(worldPosition);
  let directionalShadows = getPCFDirectionalShadows(worldPosition);
`
);

export { getPCFShadows };
