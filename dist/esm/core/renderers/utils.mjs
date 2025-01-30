import { throwError } from '../../utils/utils.mjs';

const formatRendererError = (renderer, rendererType = "GPURenderer", type) => {
  const error = type ? `Unable to create ${type} because the ${rendererType} is not defined: ${renderer}` : `The ${rendererType} is not defined: ${renderer}`;
  throwError(error);
};
const isRenderer = (renderer, type) => {
  renderer = renderer && renderer.renderer || renderer;
  const isRenderer2 = renderer && (renderer.type === "GPURenderer" || renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer");
  if (!isRenderer2) {
    formatRendererError(renderer, "GPURenderer", type);
  }
  return renderer;
};
const isCameraRenderer = (renderer, type) => {
  renderer = renderer && renderer.renderer || renderer;
  const isCameraRenderer2 = renderer && (renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer");
  if (!isCameraRenderer2) {
    formatRendererError(renderer, "GPUCameraRenderer", type);
  }
  return renderer;
};
const isCurtainsRenderer = (renderer, type) => {
  renderer = renderer && renderer.renderer || renderer;
  const isCurtainsRenderer2 = renderer && renderer.type === "GPUCurtainsRenderer";
  if (!isCurtainsRenderer2) {
    formatRendererError(renderer, "GPUCurtainsRenderer", type);
  }
  return renderer;
};
const isProjectedMesh = (object) => {
  return object.constructor.name === "Mesh" || object.constructor.name === "DOMMesh" || object.constructor.name === "Plane" ? object : false;
};

export { isCameraRenderer, isCurtainsRenderer, isProjectedMesh, isRenderer };
