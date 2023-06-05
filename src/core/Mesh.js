import { Geometry } from './Geometry'
import { Texture } from './Texture'
import { Material } from './Material'
import { isRenderer } from '../utils/renderer-utils'

export class Mesh {
  constructor(
    renderer,
    { label = 'Mesh', shaders = {}, widthSegments = 1, heightSegments = 1, uniformsBindings = [] }
  ) {
    this.type = 'Mesh'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isRenderer(renderer, this.type)) {
      console.warn('Mesh fail')
      return
    }

    this.renderer = renderer

    this.options = {
      label,
      shaders,
    }

    this.geometry = new Geometry({
      widthSegments,
      heightSegments,
    })

    this.material = new Material(this.renderer, {
      label,
      shaders,
      uniformsBindings,
      geometry: this.geometry,
    })

    this.uniforms = this.material.uniforms
  }

  /** TEXTURES **/

  createTexture(options) {
    const texture = new Texture(this.renderer, options)

    this.material.addTextureBinding(texture)

    return texture
  }

  /** Render loop **/

  /**
   *
   * @param pass
   */
  render(pass) {
    // no point to render if the WebGPU device is not ready
    if (!this.renderer.ready) return

    this.material.render(pass)
  }
}
