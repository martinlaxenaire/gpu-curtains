/**
 * WGSL functions to calculate sheen BRDF specular direct contribution.
 */
export declare const getPBRDirectSheen = "\nfn BRDF_Sheen(\n  lightDirection: vec3f,\n  viewDirection: vec3f,\n  normal: vec3f,\n  sheenColor: vec3f,\n  sheenRoughness: f32\n) -> vec3f {\n  let halfDir: vec3f = normalize( lightDirection + viewDirection );\n\n  let dotNL: f32 = saturate( dot( normal, lightDirection ) );\n  let dotNV: f32 = saturate( dot( normal, viewDirection ) );\n  let dotNH: f32 = saturate( dot( normal, halfDir ) );\n\n  let D: f32 = D_Charlie( sheenRoughness, dotNH );\n  let V: f32 = V_Neubelt( dotNV, dotNL );\n\n  return sheenColor * ( D * V );\n}\n";
