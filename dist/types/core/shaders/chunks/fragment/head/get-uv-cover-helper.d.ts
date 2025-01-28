/** Applies given texture matrix (`mat4x4f`) to given uv coordinates (`vec2f`). */
export declare const getUVCover = "\nfn getUVCover(uv: vec2f, textureMatrix: mat4x4f) -> vec2f {\n  return (textureMatrix * vec4f(uv, 0.0, 1.0)).xy;\n}";
