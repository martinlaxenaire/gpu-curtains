import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Set the `singleVolumeScatter` (`vec3f`) value from the material volume scatter.
 *
 * @param parameters - Parameters used to set the `singleVolumeScatter` (`vec3f`) value.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if volume scatter transmission is enabled.
 * @returns - String with the `singleVolumeScatter` (`vec3f`) value set.
 */
export const getVolumeMultiScatter = ({
  extensionsUsed = [],
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
}): string => {
  let volumeScatter = /* wgsl */ `
  // var singleVolumeScatter: vec3f = vec3(0.0);
  var singleVolumeScatter: vec3f = vec3(1.0);
  `

  if (!extensionsUsed.includes('KHR_materials_volume_scatter')) {
    return volumeScatter
  }

  volumeScatter += /* wgsl */ `
  singleVolumeScatter = getVolumeMultiToSingleScatter(multiscatterColor);`

  return volumeScatter
}
