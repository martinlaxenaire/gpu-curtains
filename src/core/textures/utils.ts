// texture bitwise flags
import { WebGPUTextureUsageConstants } from '../../utils/webgpu-constants'
import { TextureBindingType } from '../bindings/Binding'

/**  Defines all kinds of allowed texture usages as camel case strings. */
export type TextureUsageKeys = 'copySrc' | 'copyDst' | 'renderAttachment' | 'storageBinding' | 'textureBinding'

/**
 * Map {@link TextureUsageKeys | texture usage names} with actual {@link GPUDevice.createTexture.descriptor.usage | GPUTextureUsageFlags}.
 */
const textureUsages: Map<TextureUsageKeys, GPUTextureUsageFlags> = new Map([
  ['copySrc', WebGPUTextureUsageConstants.COPY_SRC],
  ['copyDst', WebGPUTextureUsageConstants.COPY_DST],
  ['renderAttachment', WebGPUTextureUsageConstants.RENDER_ATTACHMENT],
  ['storageBinding', WebGPUTextureUsageConstants.STORAGE_BINDING],
  ['textureBinding', WebGPUTextureUsageConstants.TEXTURE_BINDING],
])

/**
 * Get the corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags} based on an array of {@link TextureUsageKeys | texture usage names}.
 * @param usages - array of {@link TextureUsageKeys | texture usage names}.
 * @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags}.
 */
export const getTextureUsages = (usages: TextureUsageKeys[] = []): GPUTextureUsageFlags => {
  return usages.reduce((acc, v) => {
    return acc | textureUsages.get(v)
  }, 0)
}

/**
 * Get the corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags} based on an array of {@link TextureUsageKeys | texture usage names} if specified. If not, will try to fall back to a usage based on the {@link TextureBindingType | texture type}.
 * @param usages - array of {@link TextureUsageKeys | texture usage names}.
 * @param textureType - the {@link TextureBindingType | texture type}.
 * @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags}.
 */
export const getDefaultTextureUsage = (usages: TextureUsageKeys[] = [], textureType: TextureBindingType) => {
  if (usages.length) {
    return getTextureUsages(usages)
  }

  return textureType !== 'storage'
    ? GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT
    : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
}

/**
 * Get the corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags} based on an array of {@link TextureUsageKeys | texture usage names} if specified.
 * @param usages - array of {@link TextureUsageKeys | texture usage names}.
 * @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags}.
 */
export const getDefaultMediaTextureUsage = (usages: TextureUsageKeys[] = []) => {
  return getDefaultTextureUsage(usages, 'texture')
}

/**
 * Get the number of mip levels create based on {@link types/Textures.TextureSize | size}
 * @param sizes - Array containing our texture width, height and depth
 * @returns - number of mip levels
 */
export const getNumMipLevels = (...sizes: number[]): number => {
  const maxSize = Math.max(...sizes)
  return (1 + Math.log2(maxSize)) | 0
}
