/** Convert vertex position as `vec2f` or `vec3f` to uv coordinates `vec2f`. */
export declare const getVertexToUVCoords = "\nfn getVertex2DToUVCoords(vertex: vec2f) -> vec2f {\n  return vec2(\n    vertex.x * 0.5 + 0.5,\n    0.5 - vertex.y * 0.5\n  );\n}\n\nfn getVertex3DToUVCoords(vertex: vec3f) -> vec2f {\n  return getVertex2DToUVCoords( vec2(vertex.x, vertex.y) );\n}\n";
