export const discardParticleFragment = /* wgsl */ `
  if(distance(fsInput.uv, vec2(0.5)) > 0.5) {
    discard;
  }
`
