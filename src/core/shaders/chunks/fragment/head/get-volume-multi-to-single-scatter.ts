/**
 * WGSL function to calculate volume scattering.
 */
export const getVolumeMultiToSingleScatter = /* wgsl */ `
fn getVolumeMultiToSingleScatter(multiscatterColor: vec3f) -> vec3f {
    let s: vec3f = 4.09712 + 4.20863 * multiscatterColor - sqrt(9.59217 + 41.6808 * multiscatterColor + 17.7126 * multiscatterColor * multiscatterColor);
    return 1.0 - s * s;
}
`
