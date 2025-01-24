import common from '../common.wgsl.mjs';

var light_utils = (
  /* wgsl */
  `
${common}

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

fn rangeAttenuation(range: f32, distance: f32) -> f32 {
  var distanceFalloff: f32 = 1.0 / max( pow( distance, 2.0 ), 0.01 );
  if ( range > 0.0 ) {
      distanceFalloff *= pow2( clamp( 1.0 - pow4( distance / range ), 0.0, 1.0 ) );
  }
  
  return distanceFalloff;
}

fn BRDF_Lambert(diffuseColor: vec3f) -> vec3f {
  return RECIPROCAL_PI * diffuseColor;
}

fn F_Schlick(VdotH: f32, f0: vec3f, f90: f32) -> vec3f {
  let fresnel: f32 = pow( 1.0 - VdotH, 5.0 );
  return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
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
  (*ptr_light).visible = length((*ptr_light).color) > 0.0001;
}
`
);

export { light_utils as default };
