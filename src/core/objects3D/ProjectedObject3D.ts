import { Object3D } from './Object3D'
import { ProjectedObject3DMatrices } from '../../types/core/objects3D/ProjectedObject3D'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { isCameraRenderer, CameraRenderer } from '../../utils/renderer-utils'
import { Mat4 } from '../../math/Mat4'
import { Camera } from '../camera/Camera'

export class ProjectedObject3D extends Object3D {
  renderer: CameraRenderer
  camera: Camera

  matrices: ProjectedObject3DMatrices

  constructor(renderer: CameraRenderer | GPUCurtains) {
    super()

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as CameraRenderer)

    isCameraRenderer(renderer, 'ProjectedObject3D')

    this.renderer = renderer
    this.camera = this.renderer.camera
  }

  applyPosition() {
    super.applyPosition()
    this.updateProjectionMatrixStack()
  }

  applyRotation() {
    super.applyRotation()
    this.updateProjectionMatrixStack()
  }

  applyScale() {
    super.applyScale()
    this.updateProjectionMatrixStack()
  }

  applyTransformOrigin() {
    super.applyTransformOrigin()
    this.updateProjectionMatrixStack()
  }

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

  get modelViewMatrix(): Mat4 {
    return this.matrices.modelView.matrix
  }

  set modelViewMatrix(value: Mat4) {
    this.matrices.modelView.matrix = value
    this.matrices.modelView.shouldUpdate = true
  }

  get viewMatrix(): Mat4 {
    return this.camera.viewMatrix
  }

  get projectionMatrix(): Mat4 {
    return this.camera.projectionMatrix
  }

  get modelViewProjectionMatrix(): Mat4 {
    return this.matrices.modelViewProjection.matrix
  }

  set modelViewProjectionMatrix(value: Mat4) {
    this.matrices.modelViewProjection.matrix = value
    this.matrices.modelViewProjection.shouldUpdate = true
  }

  updateProjectionMatrixStack() {
    this.matrices.modelView.shouldUpdate = true
    this.matrices.modelViewProjection.shouldUpdate = true
  }

  updateSizePositionAndProjection() {
    this.updateModelMatrix()
    this.updateProjectionMatrixStack()
  }

  render() {
    for (const matrixName in this.matrices) {
      if (this.matrices[matrixName].shouldUpdate) {
        this.matrices[matrixName].onUpdate()
        this.matrices[matrixName].shouldUpdate = false
      }
    }
  }
}
