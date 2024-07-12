var light_contribution = (
  /* wgsl */
  `
struct LightContribution {
  ambient: vec3f,
  diffuse: vec3f,
  specular: vec3f
};

struct ReflectedLight {
  directDiffuse: vec3f,
  directSpecular: vec3f,
  indirectDiffuse: vec3f,
  indirectSpecular: vec3f,
}`
);

export { light_contribution as default };
