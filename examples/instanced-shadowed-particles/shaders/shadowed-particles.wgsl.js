import { discardParticleFragment } from './chunks/discard-particle-fragment.wgsl.js'
import { getParticleSize } from './chunks/get-particle-size.wgsl.js'

export const particlesDepthPassShaders = /* wgsl */ `
  struct DepthVSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  };
  
  ${getParticleSize}
  
  @vertex fn shadowMapVertex(
    attributes: Attributes,
  ) -> DepthVSOutput {
    var depthVsOutput: DepthVSOutput;

    depthVsOutput.uv = attributes.uv;
    
    // get our directional light & shadow
    let directionalShadow: DirectionalShadowsElement = directionalShadows.directionalShadowsElements[0];
    
    let size: f32 = getParticleSize(attributes.particlePosition.w, attributes.particleVelocity.w);
    
    // billboarding
    let modelPosition: vec4f = matrices.model * vec4(attributes.particlePosition.xyz, 1.0);
    let normal = getWorldNormal(attributes.normal);
    
    // no normal bias
    var mvPosition: vec4f = directionalShadow.viewMatrix * modelPosition;
    mvPosition += vec4(attributes.position, 0.0) * size;
    depthVsOutput.position = directionalShadow.projectionMatrix * mvPosition;
    
    return depthVsOutput;
  }
  
  @fragment fn shadowMapFragment(fsInput: DepthVSOutput) -> @location(0) vec4f {
    ${discardParticleFragment}
    
    // we could return anything here actually
    return vec4f(1.0);
  }
`
