// import { Renderer } from '../../utils/renderer-utils'
// import { BindGroupBindingElement } from '../bindGroups/BindGroup'
import { RenderTexture } from '../../../core/textures/RenderTexture'

export interface RenderTextureBaseParams {
  label?: string
  name?: string
}

export interface RenderTextureDefaultParams extends RenderTextureBaseParams {
  fromTexture?: RenderTexture
}

export interface RenderTextureParams extends RenderTextureDefaultParams {
  fromTexture: RenderTexture | null
}

// declare const defaultRenderTextureParams: RenderTextureParams
//
// export class RenderTexture {
//   renderer: Renderer
//   type: string
//
//   texture: GPUTexture
//
//   size: {
//     width: number
//     height: number
//   }
//
//   options: RenderTextureParams
//
//   bindings: Array<BindGroupBindingElement>
//   shouldUpdateBindGroup: boolean
//
//   constructor(renderer: Renderer, parameters?: RenderTextureDefaultParams)
//
//   setSourceSize()
//
//   createTexture()
//
//   setBindings()
//
//   resize()
//
//   destroy()
// }
