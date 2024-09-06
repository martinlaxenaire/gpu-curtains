declare const _default: "\nfn lessThan3(a: vec3f, b: vec3f) -> vec3f {\n  return vec3f(vec3<bool>(a.x < b.x, a.y < b.y, a.z < b.z));\n}\n\nfn pow2( x: f32 ) -> f32 {\n    return x * x;\n}\n\nfn pow3( x: f32 ) -> f32 {\n    return x * x * x;\n}\n\nfn pow4( x: f32 ) -> f32 {\n    return pow2(x) * pow2(x);\n}\n";
export default _default;
