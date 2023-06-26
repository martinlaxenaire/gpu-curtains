import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer'
import { Plane } from '../meshes/Plane'
import { DOMMesh } from '../meshes/DOMMesh'

export class GPUCurtainsRenderer extends GPUCameraRenderer {
  //planes: (typeof Plane)[]
  //planes: Plane[]

  domMeshes: Array<DOMMesh | Plane>

  constructor({ container, pixelRatio, renderingScale, camera }: GPUCameraRendererParams)

  onCameraPositionChanged()

  onResize()

  //render()

  //destroy()
}
