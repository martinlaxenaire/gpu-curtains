/** WGSL functions to get the {@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight} or {@link core/lights/PointLight.PointLight | PointLight} informations. */
export const getLightsInfos = /* wgsl */ `
struct ReflectedLight {
  directDiffuse: vec3f,
  directSpecular: vec3f,
  indirectDiffuse: vec3f,
  indirectSpecular: vec3f,
}

struct DirectLight {
  color: vec3f,
  direction: vec3f,
  visible: bool,
}

fn rangeAttenuation(range: f32, distance: f32, decay: f32) -> f32 {
  var distanceFalloff: f32 = 1.0 / max( pow( distance, decay ), 0.01 );
  if ( range > 0.0 ) {
    distanceFalloff *= pow2( saturate( 1.0 - pow4( distance / range )) );
  }
  
  return distanceFalloff;
}

fn spotAttenuation(coneCosine: f32, penumbraCosine: f32, angleCosine: f32) -> f32 {
  return smoothstep( coneCosine, penumbraCosine, angleCosine );
}

fn getDirectionalLightInfo(directionalLight: DirectionalLightsElement, ptr_light: ptr<function, DirectLight>) {
  (*ptr_light).color = directionalLight.color;
  (*ptr_light).direction = -directionalLight.direction;
  (*ptr_light).visible = length((*ptr_light).color) > EPSILON;
}

fn getPointLightInfo(pointLight: PointLightsElement, worldPosition: vec3f, ptr_light: ptr<function, DirectLight>) {
  let lightDirection: vec3f = pointLight.position - worldPosition;
  (*ptr_light).direction = normalize(lightDirection);
  let lightDistance: f32 = length(lightDirection);
  (*ptr_light).color = pointLight.color;
  (*ptr_light).color *= rangeAttenuation(pointLight.range, lightDistance, 2.0);
  (*ptr_light).visible = length((*ptr_light).color) > EPSILON;
}

fn getSpotLightInfo(spotLight: SpotLightsElement, worldPosition: vec3f, ptr_light: ptr<function, DirectLight>) {
  let lVector: vec3f = spotLight.position - worldPosition;
  let lightDirection: vec3f = normalize(lVector);
  (*ptr_light).direction = lightDirection;

  let angleCos: f32 = dot(lightDirection, -spotLight.direction);

  let spotAttenuation: f32 = spotAttenuation(spotLight.coneCos, spotLight.penumbraCos, angleCos);

  if (spotAttenuation > 0.0) {
    let lightDistance: f32 = length(lVector);

    (*ptr_light).color = spotLight.color * spotAttenuation;
    (*ptr_light).color *= rangeAttenuation(spotLight.range, lightDistance, 2.0);
    (*ptr_light).visible = length((*ptr_light).color) > EPSILON;

  } else {
    (*ptr_light).color = vec3(0.0);
    (*ptr_light).visible = false;
  }
}
`
