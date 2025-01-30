/** Hammersley 2D WGSL function. */
export declare const hammersley2D = "\nfn radicalInverse_VdC(inputBits: u32) -> f32 {\n  var bits: u32 = inputBits;\n  bits = (bits << 16u) | (bits >> 16u);\n  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);\n  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);\n  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);\n  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);\n  return f32(bits) * 2.3283064365386963e-10; // / 0x100000000\n}\n\n// hammersley2d describes a sequence of points in the 2d unit square [0,1)^2\n// that can be used for quasi Monte Carlo integration\nfn hammersley2d(i: u32, N: u32) -> vec2f {\n  return vec2(f32(i) / f32(N), radicalInverse_VdC(i));\n}\n";
