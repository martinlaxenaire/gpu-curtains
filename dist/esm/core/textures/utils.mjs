import { WebGPUTextureUsageConstants } from "../../utils/webgpu-constants.mjs";
//#region src/core/textures/utils.ts
/**
* Map {@link TextureUsageKeys | texture usage names} with actual {@link GPUDevice.createTexture.descriptor.usage | GPUTextureUsageFlags}.
*/
const textureUsages = new Map([
	["copySrc", WebGPUTextureUsageConstants.COPY_SRC],
	["copyDst", WebGPUTextureUsageConstants.COPY_DST],
	["renderAttachment", WebGPUTextureUsageConstants.RENDER_ATTACHMENT],
	["storageBinding", WebGPUTextureUsageConstants.STORAGE_BINDING],
	["textureBinding", WebGPUTextureUsageConstants.TEXTURE_BINDING],
	["transientAttachment", WebGPUTextureUsageConstants.TRANSIENT_ATTACHMENT]
]);
/**
* Get the corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags} based on an array of {@link TextureUsageKeys | texture usage names}.
* @param usages - array of {@link TextureUsageKeys | texture usage names}.
* @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags}.
*/
const getTextureUsages = (usages = []) => {
	return usages.reduce((acc, v) => {
		return acc | textureUsages.get(v);
	}, 0);
};
/**
* Get the corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags} based on an array of {@link TextureUsageKeys | texture usage names} if specified. If not, will try to fall back to a usage based on the {@link TextureBindingType | texture type}.
* @param usages - array of {@link TextureUsageKeys | texture usage names}.
* @param textureType - the {@link TextureBindingType | texture type}.
* @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags}.
*/
const getDefaultTextureUsage = (usages = [], textureType) => {
	if (usages.length) return getTextureUsages(usages);
	return textureType !== "storage" ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST;
};
/**
* Get the corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags} based on an array of {@link TextureUsageKeys | texture usage names} if specified.
* @param usages - array of {@link TextureUsageKeys | texture usage names}.
* @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags}.
*/
const getDefaultMediaTextureUsage = (usages = []) => {
	return getDefaultTextureUsage(usages, "texture");
};
/**
* Get the number of mip levels create based on {@link types/Textures.TextureSize | size}
* @param sizes - Array containing our texture width, height and depth
* @returns - number of mip levels
*/
const getNumMipLevels = (...sizes) => {
	const maxSize = Math.max(...sizes);
	return 1 + Math.log2(maxSize) | 0;
};
//#endregion
export { getDefaultMediaTextureUsage, getDefaultTextureUsage, getNumMipLevels };
