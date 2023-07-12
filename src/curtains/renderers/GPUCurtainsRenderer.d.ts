import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer'
import { Plane } from '../meshes/Plane'
import { DOMMesh } from '../meshes/DOMMesh'

export class GPUCurtainsRenderer extends GPUCameraRenderer {
  domMeshes: Array<DOMMesh | Plane>

  constructor({ container, pixelRatio, renderingScale, production, camera }: GPUCameraRendererParams)

  onCameraPositionChanged()

  onResize()
}
