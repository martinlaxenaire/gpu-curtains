import { GPUCameraRendererParams } from '../core/renderers/GPUCameraRenderer'

export interface GPUCurtainsOptions extends Omit<GPUCameraRendererParams, 'onError'> {
  autoRender?: boolean
  autoResize?: boolean
  watchScroll?: boolean
}

export interface GPUCurtainsParams extends Partial<Omit<GPUCurtainsOptions, 'container'>> {
  container?: string | HTMLElement | null
}
