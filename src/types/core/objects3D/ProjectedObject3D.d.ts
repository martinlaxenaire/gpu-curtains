import { Object3DMatricesType, Object3DTransformMatrix } from './Object3D'

export type ProjectedObject3DMatricesType = Object3DMatricesType | 'modelView' | 'modelViewProjection'
export type ProjectedObject3DMatrices = Record<ProjectedObject3DMatricesType, Object3DTransformMatrix>

// export interface ProjectedObject3DMatrices extends Object3DMatrices {
//   //[matrixName: ProjectedObject3DMatricesType]: Object3DTransformMatrix
//
//   modelView: Object3DTransformMatrix
//   modelViewProjection: Object3DTransformMatrix
// }
