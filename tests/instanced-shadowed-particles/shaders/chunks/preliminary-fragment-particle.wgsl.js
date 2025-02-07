import { discardParticleFragment } from './discard-particle-fragment.wgsl.js'

export const preliminaryFragmentParticle = /* wgsl */ `
  ${discardParticleFragment}
  
  // clamp velocity
  let velocityLength = clamp(length(velocity.xyz), 0.0, 1.0);
  
  // use it to mix between our 2 colors
  outputColor = mix(vec4(shading.darkColor, 1.0), vec4(shading.lightColor, 1.0), vec4(vec3(velocityLength), 1.0));
`
