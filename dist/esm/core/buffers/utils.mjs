const bufferUsages = /* @__PURE__ */ new Map([
  ["copySrc", GPUBufferUsage.COPY_SRC],
  ["copyDst", GPUBufferUsage.COPY_DST],
  ["index", GPUBufferUsage.INDEX],
  ["indirect", GPUBufferUsage.INDIRECT],
  ["mapRead", GPUBufferUsage.MAP_READ],
  ["mapWrite", GPUBufferUsage.MAP_WRITE],
  ["queryResolve", GPUBufferUsage.QUERY_RESOLVE],
  ["storage", GPUBufferUsage.STORAGE],
  ["uniform", GPUBufferUsage.UNIFORM],
  ["vertex", GPUBufferUsage.VERTEX]
]);
const getBufferUsages = (usages = []) => {
  return usages.reduce((acc, v) => {
    return acc | bufferUsages.get(v);
  }, 0);
};

export { getBufferUsages };
