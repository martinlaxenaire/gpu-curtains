import { Object3DMatricesType, Object3DTransformMatrix } from './Object3D';
export type ProjectedObject3DMatricesType = Object3DMatricesType | 'modelView' | 'modelViewProjection';
export type ProjectedObject3DMatrices = Record<ProjectedObject3DMatricesType, Object3DTransformMatrix>;
