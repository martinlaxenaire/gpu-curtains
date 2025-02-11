/** Applies given texture matrix (`mat4x4f`) to given uv coordinates (`vec2f`). */
export declare const getUVCover = "\nfn getUVCover(uv: vec2f, textureMatrix: mat3x3f) -> vec2f {\n  return (textureMatrix * vec3f(uv, 1.0)).xy;\n}";
