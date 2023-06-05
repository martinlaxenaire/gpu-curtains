import { GPURenderer } from './GPURenderer'
import { Camera } from '../camera/Camera'
import { UniformBinding } from '../bindings/UniformBinding'
import { BindGroup } from '../bindings/BindGroup'
import { Vec3 } from '../../math/Vec3'

export class GPUCameraRenderer extends GPURenderer {
  constructor({ container, pixelRatio, renderingScale = 1, camera = {} }) {
    super({ container, pixelRatio, renderingScale })

    this.type = 'CameraRenderer'

    this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1
    this.renderingScale = renderingScale

    camera = { ...{ fov: 50, near: 0.01, far: 50 }, ...camera }
    this.setCamera(camera)
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
        this.onCameraPositionChanged()
      },
    })

    this.setCameraUniformBinding()
  }

  onCameraPositionChanged() {
    this.updateCameraMatrixStack()
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
    super.resize(boundingRect)
  }

  onResize() {
    this.updateCameraMatrixStack()
  }

  /**
   * Called at each draw call to render our scene and its content
   * Also create shader modules if not already created
   */

  onBeforeRenderPass() {
    super.onBeforeRenderPass()
  }

  onBeginRenderPass(pass) {
    super.onBeginRenderPass(pass)
  }

  onAfterRenderPass() {
    super.onAfterRenderPass()
  }

  render() {
    if (!this.ready) return

    this.cameraUniformBinding?.onBeforeRender()

    this.setCameraBindGroup()

    this.cameraBindGroup?.updateBindings()

    super.render()
  }
}
