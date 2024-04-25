// texture bitwise flags
import { RenderTextureBindingType } from './RenderTexture'

/**  Defines all kinds of allowed texture usages as camel case strings. */
export type TextureUsageKeys = 'copySrc' | 'copyDst' | 'renderAttachment' | 'storageBinding' | 'textureBinding'

/**
 * Map {@link TextureUsageKeys | texture usage names} with actual {@link GPUTextureUsageFlags | texture usage bitwise flags}.
 */
const textureUsages: Map<TextureUsageKeys, GPUTextureUsageFlags> = new Map([
  ['copySrc', GPUTextureUsage.COPY_SRC],
  ['copyDst', GPUTextureUsage.COPY_DST],
  ['renderAttachment', GPUTextureUsage.RENDER_ATTACHMENT],
  ['storageBinding', GPUTextureUsage.STORAGE_BINDING],
  ['textureBinding', GPUTextureUsage.TEXTURE_BINDING],
])

/**
 * Get the corresponding {@link GPUTextureUsageFlags | texture usage bitwise flags} based on an array of {@link TextureUsageKeys | texture usage names}.
 * @param usages - array of {@link TextureUsageKeys | texture usage names}.
 * @returns - corresponding {@link GPUTextureUsageFlags | texture usage bitwise flags}.
 */
export const getTextureUsages = (usages: TextureUsageKeys[] = []): GPUTextureUsageFlags => {
  return usages.reduce((acc, v) => {
    return acc | textureUsages.get(v)
  }, 0)
}

/**
 * Get the corresponding {@link GPUTextureUsageFlags | texture usage bitwise flags} based on an array of {@link TextureUsageKeys | texture usage names} if specified. If not, will try to fall back to a usage based on the {@link RenderTextureBindingType | render texture type}.
 * @param usages - array of {@link TextureUsageKeys | texture usage names}.
 * @param textureType - the {@link RenderTextureBindingType | render texture type}.
 * @returns - corresponding {@link GPUTextureUsageFlags | texture usage bitwise flags}.
 */
export const getRenderTextureUsage = (usages: TextureUsageKeys[] = [], textureType: RenderTextureBindingType) => {
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
