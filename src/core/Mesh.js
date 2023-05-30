import { Geometry } from './Geometry'
import { Texture } from './Texture'
import { Material } from './Material'

export class Mesh {
  constructor(
    renderer,
    { label = 'Mesh', shaders = {}, widthSegments = 1, heightSegments = 1, uniformsBindings = [] }
  ) {
    this.type = 'Mesh'

    // we could pass our curtains object OR our curtains renderer object
    // TODO really needed here?
    renderer = (renderer && renderer.renderer) || renderer

    if (!renderer || renderer.type !== 'Renderer') {
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
