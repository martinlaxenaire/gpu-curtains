const getVolumeMultiScatter = ({
  extensionsUsed = []
}) => {
  let volumeScatter = (
    /* wgsl */
    `
  var singleVolumeScatter: vec3f = vec3(0.0);`
  );
  if (!extensionsUsed.includes("KHR_materials_volume_scatter")) {
    return volumeScatter;
  }
  volumeScatter += /* wgsl */
  `
  singleVolumeScatter = getVolumeMultiToSingleScatter(multiscatterColor);`;
  return volumeScatter;
};

export { getVolumeMultiScatter };
