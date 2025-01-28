/**
 * Get {@link PointLight} shadow map pass fragment shader.
 * @param lightIndex - Index of the {@link PointLight} for which to render the depth pass.
 */
export const getDefaultPointShadowDepthFs = (lightIndex = 0): string => /* wgsl */ `
struct PointShadowVSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec3f,
}

@fragment fn main(fsInput: PointShadowVSOutput) -> @builtin(frag_depth) f32 {
  // get distance between fragment and light source
  var lightDistance: f32 = length(fsInput.worldPosition - pointLights.elements[${lightIndex}].position);
  
  let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[${lightIndex}];
  
  // map to [0, 1] range by dividing by far plane - near plane
  lightDistance = (lightDistance - pointShadow.cameraNear) / (pointShadow.cameraFar - pointShadow.cameraNear);
  
  // write this as modified depth
  return clamp(lightDistance, 0.0, 1.0);
}`