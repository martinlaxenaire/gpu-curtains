/** WGSL functions to get the {@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight} or {@link core/lights/PointLight.PointLight | PointLight} informations. */
export declare const getLightsInfos = "\nstruct ReflectedLight {\n  directDiffuse: vec3f,\n  directSpecular: vec3f,\n  indirectDiffuse: vec3f,\n  indirectSpecular: vec3f,\n}\n\nstruct DirectLight {\n  color: vec3f,\n  direction: vec3f,\n  visible: bool,\n}\n\nfn rangeAttenuation(range: f32, distance: f32, decay: f32) -> f32 {\n  var distanceFalloff: f32 = 1.0 / max( pow( distance, decay ), 0.01 );\n  if ( range > 0.0 ) {\n    distanceFalloff *= pow2( saturate( 1.0 - pow4( distance / range )) );\n  }\n  \n  return distanceFalloff;\n}\n\nfn spotAttenuation(coneCosine: f32, penumbraCosine: f32, angleCosine: f32) -> f32 {\n  return smoothstep( coneCosine, penumbraCosine, angleCosine );\n}\n\nfn getDirectionalLightInfo(directionalLight: DirectionalLightsElement, ptr_light: ptr<function, DirectLight>) {\n  (*ptr_light).color = directionalLight.color;\n  (*ptr_light).direction = -directionalLight.direction;\n  (*ptr_light).visible = length((*ptr_light).color) > EPSILON;\n}\n\nfn getPointLightInfo(pointLight: PointLightsElement, worldPosition: vec3f, ptr_light: ptr<function, DirectLight>) {\n  let lightDirection: vec3f = pointLight.position - worldPosition;\n  (*ptr_light).direction = normalize(lightDirection);\n  let lightDistance: f32 = length(lightDirection);\n  (*ptr_light).color = pointLight.color;\n  (*ptr_light).color *= rangeAttenuation(pointLight.range, lightDistance, 2.0);\n  (*ptr_light).visible = length((*ptr_light).color) > EPSILON;\n}\n\nfn getSpotLightInfo(spotLight: SpotLightsElement, worldPosition: vec3f, ptr_light: ptr<function, DirectLight>) {\n  let lVector: vec3f = spotLight.position - worldPosition;\n  let lightDirection: vec3f = normalize(lVector);\n  (*ptr_light).direction = lightDirection;\n\n  let angleCos: f32 = dot(lightDirection, -spotLight.direction);\n\n  let spotAttenuation: f32 = spotAttenuation(spotLight.coneCos, spotLight.penumbraCos, angleCos);\n\n  if (spotAttenuation > 0.0) {\n    let lightDistance: f32 = length(lVector);\n\n    (*ptr_light).color = spotLight.color * spotAttenuation;\n    (*ptr_light).color *= rangeAttenuation(spotLight.range, lightDistance, 2.0);\n    (*ptr_light).visible = length((*ptr_light).color) > EPSILON;\n\n  } else {\n    (*ptr_light).color = vec3(0.0);\n    (*ptr_light).visible = false;\n  }\n}\n";
