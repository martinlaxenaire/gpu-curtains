import { Object3D, Object3DMatricesType, Object3DTransformMatrix } from './Object3D'
import { Camera } from '../camera/Camera'
import { Mat4 } from '../../math/Mat4'
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'

export type ProjectedObject3DMatricesType = Object3DMatricesType | 'modelView' | 'modelViewProjection'
type ProjectedObject3DMatrices = Record<ProjectedObject3DMatricesType, Object3DTransformMatrix>

export class ProjectedObject3D extends Object3D {
  renderer: GPUCurtainsRenderer
  camera: Camera

  matrices: ProjectedObject3DMatrices

  constructor(renderer: GPUCurtainsRenderer)

  get modelViewMatrix()
  set modelViewMatrix(value: Mat4)

  get viewMatrix()

  get projectionMatrix()

  get modelViewProjectionMatrix()
  set modelViewProjectionMatrix(value: Mat4)

  updateProjectionMatrixStack()
  updateSizePositionAndProjection()

  render()
}
