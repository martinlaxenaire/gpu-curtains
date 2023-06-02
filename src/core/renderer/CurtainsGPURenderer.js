import { GPURenderer } from './GPURenderer'
import { DOMElement } from '../DOMElement'
import { Camera } from '../../camera/Camera'
import { Vec3 } from '../../math/Vec3'
import { UniformBinding } from '../bindings/UniformBinding'
import { BindGroup } from '../bindings/BindGroup'

export class CurtainsGPURenderer extends GPURenderer {
  constructor({ container, pixelRatio, renderingScale = 1, camera = {} }) {
    super()

    this.type = 'CurtainsRenderer'

    this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1
    this.renderingScale = renderingScale

    // needed to get container bounding box
    this.domElement = new DOMElement({
      element: container,
      // onSizeChanged: (boundingRect) => {
      //   this.resize(boundingRect)
      // },
    })

    camera = { ...{ fov: 50, near: 0.01, far: 50 }, ...camera }
    this.setCamera(camera)

    this.setRendererObjects()

    // needed to trigger resize
    this.documentBody = new DOMElement({
      element: document.body,
      onSizeChanged: () => {
        this.resize()
      },
    })
  }

  setCamera(camera) {
    this.camera = new Camera({
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      width: this.domElement.boundingRect.width,
      height: this.domElement.boundingRect.height,
      pixelRatio: this.pixelRatio,
      // TODO is this still needed after all?
      // onBeforePerspectiveUpdate: () => {
      //   this.planes?.forEach((plane) => plane.updateSizePositionAndProjection())
      // },
      onPositionChanged: () => {
        this.updateCameraMatrixStack()
        this.planes?.forEach((plane) => plane.updateSizePositionAndProjection())
      },
    })

    this.setCameraUniformBinding()
  }

  setCameraUniformBinding() {
    this.cameraUniformBinding = new UniformBinding({
      label: 'Camera',
      name: 'camera',
      visibility: 'vertex',
      uniforms: {
        model: {
          // camera model matrix
          name: 'model',
          type: 'mat4x4f',
          value: this.camera.modelMatrix,
          onBeforeUpdate: () => {
            this.cameraUniformBinding.uniforms.model.value = this.camera.modelMatrix
          },
        },
        view: {
          // camera view matrix
          name: 'view',
          type: 'mat4x4f',
          value: this.camera.viewMatrix,
          onBeforeUpdate: () => {
            this.cameraUniformBinding.uniforms.view.value = this.camera.viewMatrix
          },
        },
        projection: {
          // camera projection matrix
          name: 'projection',
          type: 'mat4x4f',
          value: this.camera.projectionMatrix,
          onBeforeUpdate: () => {
            this.cameraUniformBinding.uniforms.projection.value = this.camera.projectionMatrix
          },
        },
      },
    })

    // now initialize bind group
    this.cameraBindGroup = new BindGroup({
      label: 'Camera Uniform bind group',
      renderer: this,
      bindings: [this.cameraUniformBinding],
    })
  }

  setCameraBindGroup() {
    if (this.cameraBindGroup.canCreateBindGroup()) {
      this.cameraBindGroup.setIndex(0)
      this.cameraBindGroup.createBindingsBuffers()
      this.cameraBindGroup.setBindGroupLayout()
      this.cameraBindGroup.setBindGroup()
    }
  }

  updateCameraMatrixStack() {
    this.cameraUniformBinding?.shouldUpdateUniform('model')
    this.cameraUniformBinding?.shouldUpdateUniform('view')
    this.cameraUniformBinding?.shouldUpdateUniform('projection')
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

  setCameraPosition(position = new Vec3(0, 0, 1)) {
    this.camera.setPosition(position)
  }

  resize(boundingRect) {
    super.resize(boundingRect ?? this.domElement.element.getBoundingClientRect())

    this.updateCameraMatrixStack()

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

    this.cameraUniformBinding?.onBeforeRender()

    this.setCameraBindGroup()

    this.cameraBindGroup?.updateBindings()

    this.textures.forEach((texture) => this.setTexture(texture))

    super.render()
  }

  destroy() {
    this.planes.forEach((plane) => plane.destroy())

    this.textures.forEach((texture) => texture.destroy())

    super.destroy()
  }
}
