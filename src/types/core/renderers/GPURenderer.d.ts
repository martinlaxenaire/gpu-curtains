import { Mesh } from '../../../core/meshes/Mesh'
// TODO should be GPUCurtainsRenderer props
import { Plane } from '../../../curtains/meshes/Plane'
import { DOMMesh } from '../../../curtains/meshes/DOMMesh'

export interface GPURendererParams {
  container: string | HTMLElement
  pixelRatio?: number
  sampleCount?: GPUSize32
  production?: boolean
  preferredFormat?: GPUTextureFormat
  onError?: () => void
}

// TODO should be GPUCurtainsRenderer props?
export type DOMMeshType = DOMMesh | Plane
export type MeshType = Mesh | DOMMeshType
