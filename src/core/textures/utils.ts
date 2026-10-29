// texture bitwise flags
import { throwError } from '../../utils/utils'
import { WebGPUTextureUsageConstants } from '../../utils/webgpu-constants'
import { TextureBindingType } from '../bindings/Binding'

/**  Defines all kinds of allowed texture usages as camel case strings. */
export type TextureUsageKeys =
  | 'copySrc'
  | 'copyDst'
  | 'renderAttachment'
  | 'storageBinding'
  | 'textureBinding'
  | 'transientAttachment'

/**
 * Map {@link TextureUsageKeys | texture usage names} with actual {@link GPUDevice.createTexture.descriptor.usage | GPUTextureUsageFlags}.
 */
const textureUsages: Map<TextureUsageKeys, GPUTextureUsageFlags> = new Map([
  ['copySrc', WebGPUTextureUsageConstants.COPY_SRC],
  ['copyDst', WebGPUTextureUsageConstants.COPY_DST],
  ['renderAttachment', WebGPUTextureUsageConstants.RENDER_ATTACHMENT],
  ['storageBinding', WebGPUTextureUsageConstants.STORAGE_BINDING],
  ['textureBinding', WebGPUTextureUsageConstants.TEXTURE_BINDING],
  ['transientAttachment', WebGPUTextureUsageConstants.TRANSIENT_ATTACHMENT],
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

/**
 * Get the right typed array to use to write to the {@link GPUTexture}.
 * @param color - {@link core/textures/Texture.Texture | Texture} color to use.
 * @param format - {@link GPUTexture.format | GPUTexture format} to use.
 * @returns - Typed array that could be used to write into the {@link GPUTexture}.
 */
export const getTextureColorArray = (color: number[], format: GPUTextureFormat): GPUAllowSharedBufferSource => {
  const floatToFloat16 = (value: number): number => {
    const f32 = new Float32Array([value])
    const bits = new Uint32Array(f32.buffer)[0]

    const sign = (bits >>> 16) & 0x8000
    let exponent = ((bits >>> 23) & 0xff) - 127 + 15
    let mantissa = bits & 0x7fffff

    if (exponent <= 0) {
      if (exponent < -10) return sign
      mantissa = (mantissa | 0x800000) >> (1 - exponent)
      return sign | ((mantissa + 0x1000) >> 13)
    }

    if (exponent >= 31) {
      return sign | 0x7c00 | (mantissa ? 0x0200 : 0)
    }

    return sign | (exponent << 10) | ((mantissa + 0x1000) >> 13)
  }

  const match = format.match(/^(rgba|rg|r)/)
  const channels = match[1] === 'rgba' ? 4 : match[1] === 'rg' ? 2 : 1

  const values = color.slice(0, channels)

  while (values.length < channels) values.push(0)

  if (format.endsWith('unorm') || format.endsWith('unorm-srgb')) {
    return new Uint8Array(color.map((v) => Math.round(Math.max(0, Math.min(255, v)))))
  }

  if (format.endsWith('snorm')) {
    return new Int8Array(color.map((v) => Math.round((Math.max(0, Math.min(255, v)) / 255) * 127)))
  }

  if (format.endsWith('uint')) {
    if (format.includes('16')) return new Uint16Array(values)
    if (format.includes('32')) return new Uint32Array(values)
    return new Uint8Array(values)
  }

  if (format.endsWith('sint')) {
    if (format.includes('16')) return new Int16Array(values)
    if (format.includes('32')) return new Int32Array(values)
    return new Int8Array(values)
  }

  if (format.endsWith('float')) {
    const normalized = color.map((v) => Math.max(0, Math.min(255, v)) / 255)

    if (format.includes('16')) {
      return new Uint16Array(normalized.map(floatToFloat16))
    }

    return new Float32Array(normalized)
  }

  throwError(`Unsupported texture format: ${format}`)
}
