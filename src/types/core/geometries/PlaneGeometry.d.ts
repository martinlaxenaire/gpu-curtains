// import { IndexedGeometry } from './IndexedGeometry'
// import { AttributeBufferParamsOption } from '../../utils/buffers-utils'
import { GeometryBaseParams } from './Geometry'

export interface PlaneGeometryParams extends GeometryBaseParams {
  widthSegments?: number
  heightSegments?: number
}

// export class PlaneGeometry extends IndexedGeometry {
//   definition: {
//     id: number
//     width: number
//     height: number
//     count: number
//   }
//
//   constructor({ widthSegments, heightSegments, instancesCount, vertexBuffers }?: PlaneGeometryParams)
//
//   setIndexArray()
//
//   getIndexedVerticesAndUVs(vertexCount: number): Record<string, AttributeBufferParamsOption>
// }
