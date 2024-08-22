var common = (
  /* wgsl */
  `
fn lessThan3(a: vec3f, b: vec3f) -> vec3f {
  return vec3f(vec3<bool>(a.x < b.x, a.y < b.y, a.z < b.z));
}

fn pow2( x: f32 ) -> f32 {
    return x * x;
}

fn pow3( x: f32 ) -> f32 {
    return x * x * x;
}

fn pow4( x: f32 ) -> f32 {
    return pow2(x) * pow2(x);
}
`
);

export { common as default };
