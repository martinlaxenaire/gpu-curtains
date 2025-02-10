export const getParticleSize = /* wgsl */ `
  fn getParticleSize(currentLife: f32, initialLife: f32) -> f32 {    
    // scale from 0 -> 1 when life begins
    let startSize = smoothstep(0.0, 0.25, 1.0 - currentLife / initialLife);
    // scale from 1 -> 0 when life ends
    let endSize = smoothstep(0.0, 0.25, currentLife / initialLife);
    
    return startSize * endSize * params.size;
  }
`
