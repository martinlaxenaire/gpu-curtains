const getDiffuse = (
  /* wgsl */
  `
  var diffuseColor: vec3f = outputColor.rgb;
  var diffuseContribution: vec3f = outputColor.rgb * (1.0 - metallic);`
);

export { getDiffuse };
