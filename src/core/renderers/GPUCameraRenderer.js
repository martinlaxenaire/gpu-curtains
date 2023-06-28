import { GPURenderer } from './GPURenderer'
import { Camera } from '../camera/Camera'
import { BindGroup } from '../bindGroups/BindGroup'
import { Vec3 } from '../../math/Vec3'
import { BufferBindings } from '../bindings/BufferBindings'

export class GPUCameraRenderer extends GPURenderer {
  constructor({ container, pixelRatio = 1, renderingScale = 1, sampleCount = 4, production = false, camera = {} }) {
    super({ container, pixelRatio, renderingScale, sampleCount, production })

    this.options = {
      ...camera,
    }

    this.type = 'CameraRenderer'

    camera = { ...{ fov: 50, near: 0.01, far: 50 }, ...camera }
    this.setCamera(camera)
  }

  setCamera(camera) {
    const width = this.boundingRect ? this.boundingRect.width : 1
    const height = this.boundingRect ? this.boundingRect.height : 1

    this.camera = new Camera({
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      width,
      height,
      pixelRatio: this.pixelRatio,
      // TODO is this still needed after all?
      // onPerspectiveChanged: () => {
      //   this.planes?.forEach((plane) => plane.updateSizePositionAndProjection())
      // },
      onPositionChanged: () => {
        this.onCameraPositionChanged()
      },
    })

    this.setCameraUniformBinding()
  }

  onCameraPositionChanged() {
    this.setPerspective()
  }

  setCameraUniformBinding() {
    this.cameraUniformBinding = new BufferBindings({
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
  setPerspective(fov = 50, near = 0.01, far = 50) {
    this.camera?.setPerspective(fov, near, far, this.boundingRect.width, this.boundingRect.height, this.pixelRatio)
  }

  setCameraPosition(position = new Vec3(0, 0, 1)) {
    this.camera.setPosition(position)
  }

  resize(boundingRect = null) {
    super.resize(boundingRect)
  }

  onResize() {
    super.onResize()
    this.setPerspective()
    this.updateCameraMatrixStack()
  }

  render() {
    if (!this.ready) return

    this.cameraUniformBinding?.onBeforeRender()

    this.setCameraBindGroup()

    this.cameraBindGroup?.updateBindings()

    super.render()
  }
}
