export default /* wgsl */ `
fn FresnelSchlick(cosTheta: f32, f0: vec3f) -> vec3f {
  return f0 + (vec3(1.0) - f0) * pow(1.0 - cosTheta, 5.0);
}

fn D_BlinnPhong( shininess: f32, NdotH: f32 ) -> f32 {
  return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( NdotH, shininess );
}

fn getLightSpecularContribution(
  normal: vec3f,
  lightDirection: vec3f,
  viewDirection: vec3f,
  shininess: f32,
  specularColor: vec3f
) -> vec3f {
  let L = normalize(lightDirection);
  let NdotL = max(dot(normal, L), 0.0);
  let H: vec3f = normalize(viewDirection + L);
  
  let NdotH: f32 = clamp(dot(normal, H), 0.0, 1.0);
  let VdotH: f32 = clamp(dot(viewDirection, H), 0.0, 1.0);
  let NdotV: f32 = clamp( dot(normal, viewDirection), 0.0, 1.0 );
  
  let F: vec3f = FresnelSchlick(VdotH, specularColor);
  
  let G: f32 = 0.25; // blinn phong implicit
  
  let D = D_BlinnPhong(shininess, NdotH);
  
  let specular: vec3f = F * G * D;
        
  return specular;
}

fn getDirectionalLightDiffuseSpecularContribution(
  normal: vec3f,
  worldPosition: vec3f,
  viewDirection: vec3f,
  shininess: f32,
  specularColor: vec3f,
  specularStrength: f32
) -> LightContribution {
  var lightContribution: LightContribution;
  
  for(var i: i32 = 0; i < directionalLights.count; i++) {
    let lightDirection: vec3f = directionalLights.elements[i].position - worldPosition;
  
    lightContribution.diffuse += 
      getLightDiffuseContribution(
        normal,
        lightDirection,
      )
      * directionalLights.elements[i].color;
      
    lightContribution.specular += 
      getLightSpecularContribution(
        normal,
        lightDirection,
        viewDirection,
        shininess,
        specularColor
      )
      * specularStrength
      * directionalLights.elements[i].color;
  }
  
  return lightContribution;
}

fn getPointLightDiffuseSpecularContribution(
  normal: vec3f,
  worldPosition: vec3f,
  viewDirection: vec3f,
  shininess: f32,
  specularColor: vec3f,
  specularStrength: f32
) -> LightContribution {
  var lightContribution: LightContribution;
  
  for(var i: i32 = 0; i < pointLights.count; i++) {
    let lightDirection: vec3f = pointLights.elements[i].position - worldPosition;
    let attenuation = rangeAttenuation(pointLights.elements[i].range, length(lightDirection));
    
    if(attenuation > 0.001) {
      lightContribution.diffuse += 
        getLightDiffuseContribution(
          normal,
          lightDirection,
        )
        * attenuation
        * pointLights.elements[i].color;
        
      lightContribution.specular += 
        getLightSpecularContribution(
          normal,
          lightDirection,
          viewDirection,
          shininess,
          specularColor
        )
        * attenuation
        * specularStrength
        * pointLights.elements[i].color;
    }
  }
  
  return lightContribution;
}

fn getTotalDiffuseSpecularContribution(
  normal: vec3f,
  worldPosition: vec3f,
  viewDirection: vec3f,
  shininess: f32,
  specularColor: vec3f,
  specularStrength: f32
) -> LightContribution {
  var lightContribution: LightContribution;
  
  let directionalLightContribution: LightContribution = getDirectionalLightDiffuseSpecularContribution(
    normal,
    worldPosition,
    viewDirection,
    shininess,
    specularColor,
    specularStrength
  );
  
  let pointLightContribution: LightContribution = getPointLightDiffuseSpecularContribution(
    normal,
    worldPosition,
    viewDirection,
    shininess,
    specularColor,
    specularStrength
  );
  
  lightContribution.diffuse = directionalLightContribution.diffuse + pointLightContribution.diffuse;
  lightContribution.specular = directionalLightContribution.specular + pointLightContribution.specular;
  
  return lightContribution;
}

fn getPhongLightContribution(
  normal: vec3f,
  worldPosition: vec3f,
  viewDirection: vec3f,
  shininess: f32,
  specularColor: vec3f,
  specularStrength: f32
) -> LightContribution {
  var lightContribution: LightContribution;
  
  lightContribution = getTotalDiffuseSpecularContribution(
    normal,
    worldPosition,
    viewDirection,
    shininess,
    specularColor,
    specularStrength
  );
  
  lightContribution.ambient = getAmbientContribution();
  
  return lightContribution;
}
`
