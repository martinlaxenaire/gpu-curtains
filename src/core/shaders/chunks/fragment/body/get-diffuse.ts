/**
 * Set the `diffuseColor` (`vec3f`) and the diffuse component reduced by metalness `diffuseContribution` (`vec3f`) values.
 */
export const getDiffuse = /* wgsl */ `
  var diffuseColor: vec3f = outputColor.rgb;
  var diffuseContribution: vec3f = outputColor.rgb * (1.0 - metallic);`
