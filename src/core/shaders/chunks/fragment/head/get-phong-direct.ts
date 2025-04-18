/** Helper function chunk appended internally and used to compute Phong direct light contributions. */
export const getPhongDirect = /* wgsl */ `
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
  let H: vec3f = normalize(viewDirection + directLight.direction);
  
  let NdotH: f32 = saturate(dot(normal, H));
  let VdotH: f32 = saturate(dot(viewDirection, H));
  
  let F: vec3f = F_Schlick(specularColor, 1.0, VdotH);
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
  let NdotL = saturate(dot(normal, directLight.direction));
  
  let irradiance: vec3f = NdotL * directLight.color;
  (*ptr_reflectedLight).directDiffuse += irradiance * BRDF_Lambert( diffuseColor );
  (*ptr_reflectedLight).directSpecular += irradiance * BRDF_BlinnPhong( normal, viewDirection, specularColor, shininess, directLight ) * specularStrength;
}
`
