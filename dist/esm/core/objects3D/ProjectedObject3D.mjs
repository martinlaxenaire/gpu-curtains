import { Object3D } from './Object3D.mjs';
import { isCameraRenderer } from '../renderers/utils.mjs';
import { Mat4 } from '../../math/Mat4.mjs';
import { Mat3 } from '../../math/Mat3.mjs';

class ProjectedObject3D extends Object3D {
  /**
   * ProjectedObject3D constructor
   * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link ProjectedObject3D}
   */
  constructor(renderer) {
    super();
    renderer = isCameraRenderer(renderer, "ProjectedObject3D");
    this.camera = renderer.camera;
  }
  /**
   * Tell our projection matrix stack to update
   */
  applyPosition() {
    super.applyPosition();
    this.shouldUpdateProjectionMatrixStack();
  }
  /**
   * Tell our projection matrix stack to update
   */
  applyRotation() {
    super.applyRotation();
    this.shouldUpdateProjectionMatrixStack();
  }
  /**
   * Tell our projection matrix stack to update
   */
  applyScale() {
    super.applyScale();
    this.shouldUpdateProjectionMatrixStack();
  }
  /**
   * Tell our projection matrix stack to update
   */
  applyTransformOrigin() {
    super.applyTransformOrigin();
    this.shouldUpdateProjectionMatrixStack();
  }
  /**
   * Set our transform and projection matrices
   */
  setMatrices() {
    super.setMatrices();
    this.matrices = {
      ...this.matrices,
      modelView: {
        matrix: new Mat4(),
        shouldUpdate: true,
        onUpdate: () => {
          this.modelViewMatrix.multiplyMatrices(this.viewMatrix, this.worldMatrix);
        }
      },
      modelViewProjection: {
        matrix: new Mat4(),
        shouldUpdate: true,
        onUpdate: () => {
          this.modelViewProjectionMatrix.multiplyMatrices(this.projectionMatrix, this.modelViewMatrix);
        }
      },
      normal: {
        matrix: new Mat3(),
        shouldUpdate: true,
        onUpdate: () => {
          this.normalMatrix.getNormalMatrix(this.worldMatrix);
        }
      }
    };
  }
  /**
   * Get our {@link modelViewMatrix | model view matrix}
   */
  get modelViewMatrix() {
    return this.matrices.modelView.matrix;
  }
  /**
   * Set our {@link modelViewMatrix | model view matrix}
   * @param value - new {@link modelViewMatrix | model view matrix}
   */
  set modelViewMatrix(value) {
    this.matrices.modelView.matrix = value;
    this.matrices.modelView.shouldUpdate = true;
  }
  /**
   * Get our {@link Camera#viewMatrix | camera view matrix}
   * @readonly
   */
  get viewMatrix() {
    return this.camera.viewMatrix;
  }
  /**
   * Get our {@link Camera#projectionMatrix | camera projection matrix}
   * @readonly
   */
  get projectionMatrix() {
    return this.camera.projectionMatrix;
  }
  /**
   * Get our {@link modelViewProjectionMatrix | model view projection matrix}
   */
  get modelViewProjectionMatrix() {
    return this.matrices.modelViewProjection.matrix;
  }
  /**
   * Set our {@link modelViewProjectionMatrix | model view projection matrix}
   * @param value - new {@link modelViewProjectionMatrix | model view projection matrix}s
   */
  set modelViewProjectionMatrix(value) {
    this.matrices.modelViewProjection.matrix = value;
    this.matrices.modelViewProjection.shouldUpdate = true;
  }
  /**
   * Get our {@link normalMatrix | normal matrix}
   */
  get normalMatrix() {
    return this.matrices.normal.matrix;
  }
  /**
   * Set our {@link normalMatrix | normal matrix}
   * @param value - new {@link normalMatrix | normal matrix}
   */
  set normalMatrix(value) {
    this.matrices.normal.matrix = value;
    this.matrices.normal.shouldUpdate = true;
  }
  /**
   * Set our projection matrices shouldUpdate flags to true (tell them to update)
   */
  shouldUpdateProjectionMatrixStack() {
    this.matrices.modelView.shouldUpdate = true;
    this.matrices.modelViewProjection.shouldUpdate = true;
  }
  /**
   * When the world matrix update, tell our projection matrix to update as well
   */
  shouldUpdateWorldMatrix() {
    super.shouldUpdateWorldMatrix();
    this.shouldUpdateProjectionMatrixStack();
    this.matrices.normal.shouldUpdate = true;
  }
  /**
   * Tell all our matrices to update
   */
  shouldUpdateMatrixStack() {
    this.shouldUpdateModelMatrix();
    this.shouldUpdateProjectionMatrixStack();
  }
}

export { ProjectedObject3D };
