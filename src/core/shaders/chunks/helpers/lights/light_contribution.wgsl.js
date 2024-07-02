export default /* wgsl */ `
const PI = ${Math.PI};
const RECIPROCAL_PI = ${1 / Math.PI};

struct LightContribution {
  ambient: vec3f,
  diffuse: vec3f,
  specular: vec3f
};`
