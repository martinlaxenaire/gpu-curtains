import { Vec3 } from './Vec3'

/**
 * Convert a color float component from sRGB to linear space.
 * @param c - color float component to convert.
 * @returns - converted color float component.
 */
export function sRGBToLinearFloat(c: number): number {
  return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4)
}

/**
 * Convert a color float component from linear to sRGB space.
 * @param c - color float component to convert.
 * @returns - converted color float component.
 */
export function linearTosRGBFloat(c: number): number {
  return c < 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 0.41666) - 0.055
}

/**
 * Convert a color {@link Vec3} from sRGB to linear space.
 * @param vector - color {@link Vec3} to convert.
 * @returns - converted color {@link Vec3}.
 */
export function sRGBToLinear(vector: Vec3 = new Vec3()): Vec3 {
  vector.x = sRGBToLinearFloat(vector.x)
  vector.y = sRGBToLinearFloat(vector.y)
  vector.z = sRGBToLinearFloat(vector.z)
  return vector
}

/**
 * Convert a color {@link Vec3} from linear to sRGB space.
 * @param vector - color {@link Vec3} to convert.
 * @returns - converted color {@link Vec3}.
 */
export function linearTosRGB(vector: Vec3 = new Vec3()): Vec3 {
  vector.x = linearTosRGBFloat(vector.x)
  vector.y = linearTosRGBFloat(vector.y)
  vector.z = linearTosRGBFloat(vector.z)
  return vector
}
