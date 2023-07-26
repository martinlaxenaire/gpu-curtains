import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer'
import { Plane } from '../meshes/Plane'
import { DOMMesh } from '../meshes/DOMMesh'

export class GPUCurtainsRenderer extends GPUCameraRenderer {
  domMeshes: Array<DOMMesh | Plane>

  constructor({
    container,
    pixelRatio,
    sampleCount,
    production,
    preferredFormat,
    onError,
    camera,
  }: GPUCameraRendererParams)

  onCameraPositionChanged()

  onResize()
}
