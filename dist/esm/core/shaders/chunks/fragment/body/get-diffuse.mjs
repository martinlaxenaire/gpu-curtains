const getDiffuse = (
  /* wgsl */
  `
  let diffuseColor: vec3f = outputColor.rgb;
  let diffuseContribution: vec3f = outputColor.rgb * (1.0 - metallic);`
);

export { getDiffuse };
