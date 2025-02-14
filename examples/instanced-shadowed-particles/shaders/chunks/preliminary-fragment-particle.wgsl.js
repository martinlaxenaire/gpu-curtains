import { discardParticleFragment } from './discard-particle-fragment.wgsl.js'

export const preliminaryFragmentParticle = /* wgsl */ `
  ${discardParticleFragment}
  
  // clamp velocity
  let velocityLength = saturate(length(velocity.xyz) * shading.velocityStrength);
  
  // use it to mix between our base (blue) color and our additional (pink) color
  outputColor = mix(
    outputColor,
    vec4(shading.pinkColor, 1.0),
    vec4(vec3(velocityLength), 1.0)
  );
`
