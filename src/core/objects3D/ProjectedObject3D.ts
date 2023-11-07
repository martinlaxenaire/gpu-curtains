import { Object3D, Object3DMatricesType, Object3DTransformMatrix } from './Object3D'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { CameraRenderer, isCameraRenderer } from '../../utils/renderer-utils'
import { Mat4 } from '../../math/Mat4'
import { Camera } from '../camera/Camera'

/** Defines all kind of possible {@link ProjectedObject3D} matrix types */
export type ProjectedObject3DMatricesType = Object3DMatricesType | 'modelView' | 'modelViewProjection'
/** Defines all possible [matrix object]{@link Object3DTransformMatrix} used by our {@link ProjectedObject3D} */
export type ProjectedObject3DMatrices = Record<ProjectedObject3DMatricesType, Object3DTransformMatrix>

/**
 * ProjectedObject3D class:
 * Used to create 3D objects with transform and projection matrices based on a {@see Camera}
 * @extends Object3D
 */
export class ProjectedObject3D extends Object3D {
  /** [Camera]{@link Camera} object used to compute [modelView]{@link ProjectedObject3D#modelViewMatrix} and [modelViewProjection]{@link ProjectedObject3D#modelViewProjectionMatrix} matrices */
  camera: Camera

  /** [Matrices object]{@link ProjectedObject3DMatrices} of the {@link ProjectedObject3D} */
  matrices: ProjectedObject3DMatrices

  /**
   * ProjectedObject3D constructor
   * @param renderer - our renderer class object
   */
  // TODO just use the Camera instead?
  constructor(renderer: CameraRenderer | GPUCurtains) {
    super()

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as CameraRenderer)

    isCameraRenderer(renderer, 'ProjectedObject3D')

    this.camera = renderer.camera
  }

  /**
   * Tell our projection matrix stack to update
   */
  applyPosition() {
    super.applyPosition()
    this.shouldUpdateProjectionMatrixStack()
  }

  /**
   * Tell our projection matrix stack to update
   */
  applyRotation() {
    super.applyRotation()
    this.shouldUpdateProjectionMatrixStack()
  }

  /**
   * Tell our projection matrix stack to update
   */
  applyScale() {
    super.applyScale()
    this.shouldUpdateProjectionMatrixStack()
  }

  /**
   * Tell our projection matrix stack to update
   */
  applyTransformOrigin() {
    super.applyTransformOrigin()
    this.shouldUpdateProjectionMatrixStack()
  }

  /**
   * Set our transform and projection matrices
   */
  setMatrices() {
    super.setMatrices()

    this.matrices = {
      ...this.matrices,
      modelView: {
        matrix: new Mat4(),
        shouldUpdate: false,
        onUpdate: () => {
          // our model view matrix is our model matrix multiplied with our camera view matrix
          this.modelViewMatrix.multiplyMatrices(this.camera.viewMatrix, this.modelMatrix)
        },
      },
      modelViewProjection: {
        matrix: new Mat4(),
        shouldUpdate: false,
        onUpdate: () => {
          // our modelViewProjection matrix, useful for bounding box calculations and frustum culling
          // this is the result of our projection matrix multiplied by our modelView matrix
          this.modelViewProjectionMatrix.multiplyMatrices(this.projectionMatrix, this.modelViewMatrix)
        },
      },
    }
  }

  /**
   * Get/set our model view matrix
   * @readonly
   */
  get modelViewMatrix(): Mat4 {
    return this.matrices.modelView.matrix
  }

  set modelViewMatrix(value: Mat4) {
    this.matrices.modelView.matrix = value
    this.matrices.modelView.shouldUpdate = true
  }

  /**
   * Get our camera view matrix
   * @readonly
   */
  get viewMatrix(): Mat4 {
    return this.camera.viewMatrix
  }

  /**
   * Get our camera projection matrix
   * @readonly
   */
  get projectionMatrix(): Mat4 {
    return this.camera.projectionMatrix
  }

  /**
   * Get/set our model view projection matrix
   * @readonly
   */
  get modelViewProjectionMatrix(): Mat4 {
    return this.matrices.modelViewProjection.matrix
  }

  set modelViewProjectionMatrix(value: Mat4) {
    this.matrices.modelViewProjection.matrix = value
    this.matrices.modelViewProjection.shouldUpdate = true
  }

  /**
   * Set our projection matrices shouldUpdate flags to true (tell them to update)
   */
  shouldUpdateProjectionMatrixStack() {
    this.matrices.modelView.shouldUpdate = true
    this.matrices.modelViewProjection.shouldUpdate = true
  }

  /**
   * Tell all our matrices to update
   */
  updateSizePositionAndProjection() {
    this.shouldUpdateModelMatrix()
    this.shouldUpdateProjectionMatrixStack()
  }
}
