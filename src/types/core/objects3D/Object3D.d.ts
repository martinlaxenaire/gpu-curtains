import { Vec3 } from '../../../math/Vec3'
import { Quat } from '../../../math/Quat'
import { Mat4 } from '../../../math/Mat4'
//import { ProjectedObject3DMatricesType } from './ProjectedObject3D'

export type Object3DMatricesType = 'model'

export interface Object3DTransformMatrix {
  matrix: Mat4
  shouldUpdate: boolean
  onUpdate: () => void
}

//type Object3DMatrices = Record<ProjectedObject3DMatricesType, Object3DTransformMatrix>
//interface Object3DMatrices = Record<ProjectedObject3DMatricesType, Object3DTransformMatrix>

export interface Object3DTransforms {
  origin: {
    model: Vec3
    world?: Vec3
  }
  quaternion: Quat
  rotation: Vec3
  position: {
    world: Vec3
    document?: Vec3
  }
  scale: Vec3
}

// export class Object3D {
//   transforms: Object3DTransforms
//   matrices: Object3DMatrices
//
//   constructor()
//
//   setTransforms()
//
//   get rotation(): Vec3
//   set rotation(value: Vec3)
//
//   get quaternion(): Quat
//   set quaternion(value: Quat)
//
//   get position(): Vec3
//   set position(value: Vec3)
//
//   get scale(): Vec3
//   set scale(value: Vec3)
//
//   get transformOrigin(): Vec3
//   set transformOrigin(value: Vec3)
//
//   applyRotation()
//   applyPosition()
//   applyScale()
//   applyTransformOrigin()
//
//   setMatrices()
//
//   get modelMatrix()
//   set modelMatrix(value: Mat4)
//
//   shouldUpdateModelMatrix()
//   updateModelMatrix()
//
//   updateSizeAndPosition()
// }
