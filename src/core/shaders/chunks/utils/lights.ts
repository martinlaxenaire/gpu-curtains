export const getLambert = /* wgsl */ `
fn lessThan3(a: vec3f, b: vec3f) -> vec3f {
  return vec3f(vec3<bool>(a.x < b.x, a.y < b.y, a.z < b.z));
}

fn linearToOutput3(value: vec3f) -> vec3f {
  return vec3( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThan3( value.rgb, vec3( 0.0031308 ) ) ) ) );
}

fn linearToOutput4(value: vec4f) -> vec4f {
  return vec4( linearToOutput3(value.rgb), value.a );
}

fn pow2( x: f32 ) -> f32 {
    return x * x;
}

fn pow3( x: f32 ) -> f32 {
    return x * x * x;
}

fn pow4( x: f32 ) -> f32 {
    return pow2(x) * pow2(x);
}

fn rangeAttenuation(range: f32, distance: f32) -> f32 {
  var distanceFalloff: f32 = 1.0 / max( pow( distance, 2.0 ), 0.01 );
  if ( range > 0.0 ) {
      distanceFalloff *= pow2( clamp( 1.0 - pow4( distance / range ), 0.0, 1.0 ) );
  }
  
  return distanceFalloff;
}

fn BRDF_Lambert(diffuseColor: vec3f) -> vec3f {
  return RECIPROCAL_PI * diffuseColor;
  //return diffuseColor;
}

// LIGHTS INFO

struct DirectLight {
  color: vec3f,
  direction: vec3f,
  visible: bool,
}

fn getDirectionalLightInfo(directionalLight: DirectionalLightsElement, worldPosition: vec3f, ptr_light: ptr<function, DirectLight>) {
  (*ptr_light).color = directionalLight.color;
  (*ptr_light).direction = worldPosition - directionalLight.direction;
  (*ptr_light).visible = true;
}

fn getPointLightInfo(pointLight: PointLightsElement, worldPosition: vec3f, ptr_light: ptr<function, DirectLight>) {
  let lightDirection: vec3f = pointLight.position - worldPosition;
  (*ptr_light).direction = normalize(lightDirection);
  let lightDistance: f32 = length(lightDirection);
  (*ptr_light).color = pointLight.color;
  (*ptr_light).color *= rangeAttenuation(pointLight.range, lightDistance);
  
  (*ptr_light).visible = (*ptr_light).color.r != 0.0 && (*ptr_light).color.g != 0.0 && (*ptr_light).color.b != 0.0;
}

fn getLambertDirect(
  normal: vec3f,
  diffuseColor: vec3f,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let L = normalize(directLight.direction);
  let NdotL = max(dot(normal, L), 0.0);
  
  let irradiance: vec3f = NdotL * directLight.color;
  (*ptr_reflectedLight).directDiffuse += irradiance * BRDF_Lambert( diffuseColor );
}

fn getLambertIndirectDiffuse(irradiance: vec3f, diffuseColor: vec3f, ptr_reflectedLight: ptr<function, ReflectedLight>) {
  (*ptr_reflectedLight).indirectDiffuse += irradiance * BRDF_Lambert( diffuseColor );
}

fn getLambertTotalIndirectDiffuse(diffuseColor: vec3f, ptr_reflectedLight: ptr<function, ReflectedLight>) {
  var totalAmbientIrradiance: vec3f;
  for(var i: i32 = 0; i < ambientLights.count; i++) {
    totalAmbientIrradiance += ambientLights.color[i];
  }
  
  getLambertIndirectDiffuse(totalAmbientIrradiance, diffuseColor, ptr_reflectedLight);
}

fn getLambert(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec3f
) -> vec3f {
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    getLambertDirect(normal, diffuseColor, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    getLambertDirect(normal, diffuseColor, directLight, &reflectedLight);
  }
  
  // ambient lights
  getLambertTotalIndirectDiffuse(diffuseColor, &reflectedLight);
  
  let outgoingLight: vec3f = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular;
  
  return linearToOutput3(outgoingLight);
}`

export const getPhong = /* wgsl */ `
${getLambert}

fn FresnelSchlick(cosTheta: f32, f0: vec3f) -> vec3f {
  return f0 + (vec3(1.0) - f0) * pow(1.0 - cosTheta, 5.0);
}

fn D_BlinnPhong( shininess: f32, NdotH: f32 ) -> f32 {
  return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( NdotH, shininess );
}

fn BRDF_BlinnPhong(
  normal: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  shininess: f32,
  directLight: DirectLight
) -> vec3f {
  let L = normalize(directLight.direction);
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

fn getPhongDirect(
  normal: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  specularStrength: f32,
  shininess: f32,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let L = normalize(directLight.direction);
  let NdotL = max(dot(normal, L), 0.0);
  
  let irradiance: vec3f = NdotL * directLight.color;
  (*ptr_reflectedLight).directDiffuse += irradiance * BRDF_Lambert( diffuseColor );
  (*ptr_reflectedLight).directSpecular += irradiance * BRDF_BlinnPhong( normal, viewDirection, specularColor, shininess, directLight ) * specularStrength;
}

fn getPhong(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  specularStrength: f32,
  shininess: f32
) -> vec3f {
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    getPhongDirect(normal, diffuseColor, viewDirection, specularColor, specularStrength, shininess, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    getPhongDirect(normal, diffuseColor, viewDirection, specularColor, specularStrength, shininess, directLight, &reflectedLight);
  }
  
  // ambient lights
  getLambertTotalIndirectDiffuse(diffuseColor, &reflectedLight);
  
  let outgoingLight: vec3f = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular;
  
  return linearToOutput3(outgoingLight);
}`
