import { Vec3 } from './Vec3.mjs';

function sRGBToLinearFloat(c) {
  return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}
function linearTosRGBFloat(c) {
  return c < 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 0.41666) - 0.055;
}
function sRGBToLinear(vector = new Vec3()) {
  vector.x = sRGBToLinearFloat(vector.x);
  vector.y = sRGBToLinearFloat(vector.y);
  vector.z = sRGBToLinearFloat(vector.z);
  return vector;
}
function linearTosRGB(vector = new Vec3()) {
  vector.x = linearTosRGBFloat(vector.x);
  vector.y = linearTosRGBFloat(vector.y);
  vector.z = linearTosRGBFloat(vector.z);
  return vector;
}

export { linearTosRGB, linearTosRGBFloat, sRGBToLinear, sRGBToLinearFloat };
