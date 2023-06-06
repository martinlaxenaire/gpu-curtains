import { Object3D } from './Object3D'
import { isCameraRenderer } from '../../utils/renderer-utils'
import { Mat4 } from '../../math/Mat4'

export class ProjectedObject3D extends Object3D {
  constructor(renderer) {
    super()

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isCameraRenderer(renderer, this.type)) {
      console.warn('ProjectedObject3D fail')
      return
    }

    this.renderer = renderer
    this.camera = this.renderer.camera
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
          // in our case we're just subtracting the camera Z position to our model matrix
          this.modelViewMatrix.copy(this.modelMatrix)
          this.modelViewMatrix.elements[14] -= this.camera.position.z
        },
      },
      modelViewProjection: {
        matrix: new Mat4(),
        shouldUpdate: false,
        onUpdate: () => {
          // our modelViewProjection matrix, useful for bounding box calculations and frustum culling
          // this is the result of our projection matrix multiplied by our modelView matrix
          this.modelViewProjectionMatrix = this.projectionMatrix.multiply(this.modelViewMatrix)
        },
      },
    }
  }

  get modelViewMatrix() {
    return this.matrices.modelView.matrix
  }

  set modelViewMatrix(value) {
    this.matrices.modelView.matrix = value
    this.matrices.modelView.shouldUpdate = true
  }

  get viewMatrix() {
    return this.camera.viewMatrix
  }

  get projectionMatrix() {
    return this.camera.projectionMatrix
  }

  get modelViewProjectionMatrix() {
    return this.matrices.modelViewProjection.matrix
  }

  set modelViewProjectionMatrix(value) {
    this.matrices.modelViewProjection.matrix = value
    this.matrices.modelViewProjection.shouldUpdate = true
  }

  render() {
    for (const matrixName in this.matrices) {
      if (this.matrices[matrixName].shouldUpdate) {
        this.matrices[matrixName].onUpdate()
        this.matrices[matrixName].shouldUpdate = false
      }
    }

    // if (this.camera.shouldUpdate) {
    //   this.updateProjectionMatrixStack()
    //   this.camera.shouldUpdate = false
    // }
  }
}
