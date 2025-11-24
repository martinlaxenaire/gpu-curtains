const getPBRDirectSheen = (
  /* wgsl */
  `
fn BRDF_Sheen(
  lightDirection: vec3f,
  viewDirection: vec3f,
  normal: vec3f,
  sheenColor: vec3f,
  sheenRoughness: f32
) -> vec3f {
  let halfDir: vec3f = normalize( lightDirection + viewDirection );

  let dotNL: f32 = saturate( dot( normal, lightDirection ) );
  let dotNV: f32 = saturate( dot( normal, viewDirection ) );
  let dotNH: f32 = saturate( dot( normal, halfDir ) );

  let D: f32 = D_Charlie( sheenRoughness, dotNH );
  let V: f32 = V_Neubelt( dotNV, dotNL );

  return sheenColor * ( D * V );
}

fn getPBRDirectSheen(
  normal: vec3f,
  viewDirection: vec3f,
  sheenColor: vec3f,
  sheenRoughness: f32,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) -> vec3f {
  let NdotL: f32 = saturate(dot(normal, directLight.direction));
  let irradiance: vec3f = NdotL * directLight.color;
  return irradiance * BRDF_Sheen( directLight.direction, viewDirection, normal, sheenColor, sheenRoughness );
}
`
);

export { getPBRDirectSheen };
