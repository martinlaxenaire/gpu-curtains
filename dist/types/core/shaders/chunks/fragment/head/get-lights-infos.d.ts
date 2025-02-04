/** WGSL functions to get the {@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight} or {@link core/lights/PointLight.PointLight | PointLight} informations. */
export declare const getLightsInfos = "\nstruct ReflectedLight {\n  directDiffuse: vec3f,\n  directSpecular: vec3f,\n  indirectDiffuse: vec3f,\n  indirectSpecular: vec3f,\n}\n\nstruct DirectLight {\n  color: vec3f,\n  direction: vec3f,\n  visible: bool,\n}\n\nfn rangeAttenuation(range: f32, distance: f32) -> f32 {\n  var distanceFalloff: f32 = 1.0 / max( pow( distance, 2.0 ), 0.01 );\n  if ( range > 0.0 ) {\n    distanceFalloff *= pow2( saturate( 1.0 - pow4( distance / range )) );\n  }\n  \n  return distanceFalloff;\n}\n\nfn getDirectionalLightInfo(directionalLight: DirectionalLightsElement, ptr_light: ptr<function, DirectLight>) {\n  (*ptr_light).color = directionalLight.color;\n  (*ptr_light).direction = -directionalLight.direction;\n  (*ptr_light).visible = true;\n}\n\nfn getPointLightInfo(pointLight: PointLightsElement, worldPosition: vec3f, ptr_light: ptr<function, DirectLight>) {\n  let lightDirection: vec3f = pointLight.position - worldPosition;\n  (*ptr_light).direction = normalize(lightDirection);\n  let lightDistance: f32 = length(lightDirection);\n  (*ptr_light).color = pointLight.color;\n  (*ptr_light).color *= rangeAttenuation(pointLight.range, lightDistance);\n  (*ptr_light).visible = length((*ptr_light).color) > 0.01;\n}\n";
