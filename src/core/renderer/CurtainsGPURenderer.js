import { GPURenderer } from './GPURenderer'
import { DOMElement } from '../DOMElement'
import { Camera } from '../../camera/Camera'

export class CurtainsGPURenderer extends GPURenderer {
  constructor({ container, pixelRatio, renderingScale = 1, fov = 50 }) {
    super()

    this.type = 'CurtainsRenderer'

    this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1
    this.renderingScale = renderingScale

    this.domElement = new DOMElement({
      element: container,
      // onSizeChanged: (boundingRect) => {
      //   this.resize(boundingRect)
      // },
    })

    this.documentBody = new DOMElement({
      element: document.body,
      onSizeChanged: () => {
        this.resize()
      },
    })

    this.camera = new Camera({
      fov,
      width: this.domElement.boundingRect.width,
      height: this.domElement.boundingRect.height,
      pixelRatio: this.pixelRatio,
      onBeforeUpdate: () => {
        this.planes?.forEach((plane) => plane.updateSizePositionAndProjection())
      },
    })

    this.setRendererObjects()
  }

  setRendererObjects() {
    // keep track of planes, textures, etc.
    this.planes = []
    this.textures = []
  }

  addTexture(texture) {
    this.textures.push(texture)
  }

  /** CAMERA **/

  /***
   This will set our perspective matrix new parameters (fov, near plane and far plane)
   used internally but can be used externally as well to change fov for example

   params :
   @fov (float): the field of view
   @near (float): the nearest point where object are displayed
   @far (float): the farthest point where object are displayed
   ***/
  setPerspective(fov, near, far) {
    const containerBoundingRect = this.domElement.boundingRect
    this.camera.setPerspective(
      fov,
      near,
      far,
      containerBoundingRect.width,
      containerBoundingRect.height,
      this.pixelRatio
    )
  }

  resize(boundingRect) {
    super.resize(boundingRect ?? this.domElement.element.getBoundingClientRect())

    // force plane resize
    // plane HTMLElement might not have changed
    //this.planes?.forEach((plane) => plane.updateSizeAndPosition())
    this.planes?.forEach((plane) => plane.resize())
  }

  /**
   * Called at each draw call to render our scene and its content
   * Also create shader modules if not already created
   */
  render() {
    if (!this.ready) return

    this.textures.forEach((texture) => this.setTexture(texture))

    super.render()
  }

  destroy() {
    this.planes.forEach((plane) => plane.destroy())

    this.textures.forEach((texture) => texture.destroy())

    super.destroy()
  }
}
