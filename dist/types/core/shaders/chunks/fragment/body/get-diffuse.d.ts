/**
 * Set the `diffuseColor` (`vec3f`) and the diffuse component reduced by metalness `diffuseContribution` (`vec3f`) values.
 */
export declare const getDiffuse = "\n  let diffuseColor: vec3f = outputColor.rgb;\n  let diffuseContribution: vec3f = outputColor.rgb * (1.0 - metallic);";
