const textureUsages = /* @__PURE__ */ new Map([
  ["copySrc", GPUTextureUsage.COPY_SRC],
  ["copyDst", GPUTextureUsage.COPY_DST],
  ["renderAttachment", GPUTextureUsage.RENDER_ATTACHMENT],
  ["storageBinding", GPUTextureUsage.STORAGE_BINDING],
  ["textureBinding", GPUTextureUsage.TEXTURE_BINDING]
]);
const getTextureUsages = (usages = []) => {
  return usages.reduce((acc, v) => {
    return acc | textureUsages.get(v);
  }, 0);
};
const getRenderTextureUsage = (usages = [], textureType) => {
  if (usages.length) {
    return getTextureUsages(usages);
  }
  return textureType !== "storage" ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST;
};

export { getRenderTextureUsage, getTextureUsages };
