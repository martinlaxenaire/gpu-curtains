export default /* wgsl */ `
fn rangeAttenuation(range: f32, distance: f32) -> f32 {
  let distanceFalloff = 1.0 / max(pow(distance, 2.0), 0.01);

  if (range <= 0.0) {
      // Negative range means no cutoff
      return distanceFalloff;
  }
  return clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0) * distanceFalloff;
}

fn getAmbientContribution() -> vec3f {
  var totalAmbient: vec3f = vec3();
  
  for(var i: i32 = 0; i < ambientLights.count; i++) {
    totalAmbient += ambientLights.color[i];
  }
  
  return totalAmbient;
}

fn getLightDiffuseContribution(normal: vec3f, lightDirection: vec3f) -> f32 {
  let L = normalize(lightDirection);
  let NdotL = max(dot(normal, L), 0.0);
  
  return NdotL;
}

fn getDirectionalLightDiffuseContribution(normal: vec3f, worldPosition: vec3f) -> vec3f {
  var totalDiffuse: vec3f = vec3();
  
  for(var i: i32 = 0; i < directionalLights.count; i++) {
    let lightDirection: vec3f = directionalLights.elements[i].position - worldPosition;
  
    totalDiffuse += 
      getLightDiffuseContribution(
        normal,
        lightDirection,
      )
      * directionalLights.elements[i].color;
  }
  
  return totalDiffuse;
}

fn getPointLightDiffuseContribution(normal: vec3f, worldPosition: vec3f) -> vec3f {
  var totalDiffuse: vec3f = vec3();
  
  for(var i: i32 = 0; i < pointLights.count; i++) {
    let lightDirection: vec3f = pointLights.elements[i].position - worldPosition;
    let attenuation = rangeAttenuation(pointLights.elements[i].range, length(lightDirection));
  
    if(attenuation > 0.001) {
      totalDiffuse += 
      getLightDiffuseContribution(
        normal,
        lightDirection,
      )
      * attenuation
      * pointLights.elements[i].color;
    }
  }
  
  return totalDiffuse;
}

fn getTotalDiffuseContribution(normal: vec3f, worldPosition: vec3f) -> vec3f {
  var totalDiffuse: vec3f = vec3();
  totalDiffuse += getDirectionalLightDiffuseContribution(normal, worldPosition);
  totalDiffuse += getPointLightDiffuseContribution(normal, worldPosition);
  return totalDiffuse;
}

fn getLambertLightContribution(normal: vec3f, worldPosition: vec3f) -> LightContribution {
  var lightContribution: LightContribution;
  lightContribution.ambient = getAmbientContribution();
  lightContribution.diffuse = getTotalDiffuseContribution(normal, worldPosition);
  
  return lightContribution;
}`
