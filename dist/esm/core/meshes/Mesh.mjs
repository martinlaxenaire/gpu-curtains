import { isCameraRenderer } from '../renderers/utils.mjs';
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D.mjs';
import { ProjectedMeshBaseMixin } from './mixins/ProjectedMeshBaseMixin.mjs';

class Mesh extends ProjectedMeshBaseMixin(ProjectedObject3D) {
  /**
   * Mesh constructor
   * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link Mesh}
   * @param parameters - {@link MeshBaseParams | parameters} use to create this {@link Mesh}
   */
  constructor(renderer, parameters = {}) {
    renderer = isCameraRenderer(renderer, parameters.label ? parameters.label + " Mesh" : "Mesh");
    super(renderer, null, parameters);
    this.type = "Mesh";
  }
}

export { Mesh };
