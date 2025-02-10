export const additionalVertexParticle = /* wgsl */ `
  let size: f32 = getParticleSize(attributes.particlePosition.w, attributes.particleVelocity.w);
    
  // billboarding
  worldPosition = matrices.model * vec4(attributes.particlePosition.xyz, 1.0);
  var mvPosition: vec4f = camera.view * worldPosition;
  mvPosition += vec4(attributes.position, 0.0) * size;
  vsOutput.position = camera.projection * mvPosition;
  
  vsOutput.worldPosition = (worldPosition.xyz / worldPosition.w) + attributes.position * size;
  vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
    
  // normals in view space to follow billboarding
  vsOutput.normal = getViewNormal(attributes.normal);
  
  vsOutput.velocity = attributes.particleVelocity;
`
