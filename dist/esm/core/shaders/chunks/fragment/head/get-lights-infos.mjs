const getLightsInfos = (
  /* wgsl */
  `
fn rangeAttenuation(range: f32, distance: f32) -> f32 {
  var distanceFalloff: f32 = 1.0 / max( pow( distance, 2.0 ), 0.01 );
  if ( range > 0.0 ) {
    distanceFalloff *= pow2( saturate( 1.0 - pow4( distance / range )) );
  }
  
  return distanceFalloff;
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

export { getLightsInfos };
