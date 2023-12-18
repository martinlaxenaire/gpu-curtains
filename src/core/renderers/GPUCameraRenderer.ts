import { GPURenderer, GPURendererParams, ProjectedMesh } from './GPURenderer'
import { Camera, CameraBasePerspectiveOptions } from '../camera/Camera'
import { BufferBinding } from '../bindings/BufferBinding'
import { BindGroup } from '../bindGroups/BindGroup'
import { Vec3 } from '../../math/Vec3'

/**
 * Parameters used to create a {@link GPUCameraRenderer}
 */
export interface GPUCameraRendererParams extends GPURendererParams {
  /** An object defining [camera perspective parameters]{@link CameraBasePerspectiveOptions} */
  camera: CameraBasePerspectiveOptions
}

/**
 * GPUCameraRenderer class:
 * This renderer also creates a {@link Camera} and its associated [struct]{@link GPUCameraRenderer#cameraBufferBinding} and [bind group]{@link GPUCameraRenderer#cameraBindGroup}
 * @extends GPURenderer
 */
export class GPUCameraRenderer extends GPURenderer {
  /** {@link Camera} used by this {@link GPUCameraRenderer} */
  camera: Camera
  /** [struct]{@link BufferBinding} handling the [camera]{@link GPUCameraRenderer#camera} matrices */
  cameraBufferBinding: BufferBinding
  /** [bind group]{@link BindGroup} handling the [camera buffer struct]{@link GPUCameraRenderer#cameraBufferBinding} */
  cameraBindGroup: BindGroup

  /**
   * GPUCameraRenderer constructor
   * @param parameters - [parameters]{@link GPUCameraRendererParams} used to create this {@link GPUCameraRenderer}
   */
  constructor({
    deviceManager,
    container,
    pixelRatio = 1,
    sampleCount = 4,
    preferredFormat,
    alphaMode = 'premultiplied',
    camera = {},
  }: GPUCameraRendererParams) {
    super({
      deviceManager,
      container,
      pixelRatio,
      sampleCount,
      preferredFormat,
      alphaMode,
    })

    this.type = 'GPUCameraRenderer'

    camera = { ...{ fov: 50, near: 0.01, far: 50 }, ...camera }
    this.setCamera(camera)
  }

  /**
   * Called when the [renderer device]{@link GPURenderer#device} is lost.
   * Reset all our samplers, force all our scene objects and camera bind group to lose context.
   */
  loseContext() {
    super.loseContext()
    // lose camera bind group context as well
    this.cameraBindGroup.loseContext()
  }

  /**
   * Called when the [renderer device]{@link GPURenderer#device} should be restored.
   * Reset the adapter, device and configure context again, reset our samplers, restore our scene objects context, resize the render textures, re-write our camera buffer binding.
   * @async
   */
  async restoreContext(): Promise<void> {
    this.cameraBufferBinding.shouldUpdate = true
    return super.restoreContext()
  }

  /**
   * Set the [camera]{@link GPUCameraRenderer#camera}
   * @param cameraParameters - [parameters]{@link CameraBasePerspectiveOptions} used to create the [camera]{@link GPUCameraRenderer#camera}
   */
  setCamera(cameraParameters: CameraBasePerspectiveOptions) {
    const width = this.boundingRect ? this.boundingRect.width : 1
    const height = this.boundingRect ? this.boundingRect.height : 1

    this.camera = new Camera({
      fov: cameraParameters.fov,
      near: cameraParameters.near,
      far: cameraParameters.far,
      width,
      height,
      pixelRatio: this.pixelRatio,
      onMatricesChanged: () => {
        this.onCameraMatricesChanged()
      },
    })

    this.setCameraBufferBinding()
  }

  /**
   * Update the [projected meshes]{@link MeshTransformedBaseClass} sizes and positions when the [camera]{@link GPUCurtainsRenderer#camera} [position]{@link Camera#position} changes
   */
  onCameraMatricesChanged() {
    this.updateCameraBindings()

    this.meshes.forEach((mesh) => {
      if ('modelViewMatrix' in mesh) {
        mesh.updateSizePositionAndProjection()
      }
    })
  }

  /**
   * Set the [camera buffer struct]{@link GPUCameraRenderer#cameraBufferBinding} and [camera bind group]{@link GPUCameraRenderer#cameraBindGroup}
   */
  setCameraBufferBinding() {
    this.cameraBufferBinding = new BufferBinding({
      label: 'Camera',
      name: 'camera',
      visibility: 'vertex',
      struct: {
        model: {
          // camera model matrix
          name: 'model',
          type: 'mat4x4f',
          value: this.camera.modelMatrix,
          onBeforeUpdate: () => {
            this.cameraBufferBinding.inputs.model.value = this.camera.modelMatrix
          },
        },
        view: {
          // camera view matrix
          name: 'view',
          type: 'mat4x4f',
          value: this.camera.viewMatrix,
          onBeforeUpdate: () => {
            this.cameraBufferBinding.inputs.view.value = this.camera.viewMatrix
          },
        },
        projection: {
          // camera projection matrix
          name: 'projection',
          type: 'mat4x4f',
          value: this.camera.projectionMatrix,
          onBeforeUpdate: () => {
            this.cameraBufferBinding.inputs.projection.value = this.camera.projectionMatrix
          },
        },
      },
    })

    // now initialize bind group
    this.cameraBindGroup = new BindGroup(this, {
      label: 'Camera Uniform bind group',
      bindings: [this.cameraBufferBinding],
    })
  }

  /**
   * Create the [camera bind group]{@link GPUCameraRenderer#cameraBindGroup} buffers
   */
  setCameraBindGroup() {
    if (this.cameraBindGroup.shouldCreateBindGroup) {
      this.cameraBindGroup.setIndex(0)
      this.cameraBindGroup.createBindGroup()
    }
  }

  /**
   * Tell our [camera buffer struct]{@link GPUCameraRenderer#cameraBufferBinding} that we should update its struct
   */
  updateCameraBindings() {
    this.cameraBufferBinding?.shouldUpdateBinding('model')
    this.cameraBufferBinding?.shouldUpdateBinding('view')
    this.cameraBufferBinding?.shouldUpdateBinding('projection')
  }

  /**
   * Set our [camera]{@link GPUCameraRenderer#camera} perspective matrix new parameters (fov, near plane and far plane)
   * @param parameters - [parameters]{@link CameraBasePerspectiveOptions} to use for the perspective
   */
  setPerspective({ fov, near, far }: CameraBasePerspectiveOptions = {}) {
    this.camera?.setPerspective({
      fov,
      near,
      far,
      width: this.boundingRect.width,
      height: this.boundingRect.height,
      pixelRatio: this.pixelRatio,
    })
  }

  /**
   * Set our [camera]{@link GPUCameraRenderer#camera} position
   * @param position - new [position]{@link Camera#position}
   */
  setCameraPosition(position: Vec3 = new Vec3(0, 0, 1)) {
    this.camera.position.copy(position)
  }

  /**
   * Call our [super onResize method]{@link GPURenderer#onResize} and resize our [camera]{@link GPUCameraRenderer#camera} as well
   */
  onResize() {
    super.onResize()
    this.setPerspective()
    this.updateCameraBindings()
  }

  /* RENDER */

  /**
   * Update the camera model matrix, check if the [camera bind group]{@link GPUCameraRenderer#cameraBindGroup} should be created, create it if needed and then update it
   */
  updateCamera() {
    this.camera?.updateMatrixStack()
    this.setCameraBindGroup()
    this.cameraBindGroup?.update()
  }

  /**
   * Render a single [Mesh]{@link ProjectedMesh} (binds the camera bind group if needed)
   * @param commandEncoder - current {@link GPUCommandEncoder}
   * @param mesh - [Mesh]{@link ProjectedMesh} to render
   */
  renderSingleMesh(commandEncoder: GPUCommandEncoder, mesh: ProjectedMesh) {
    const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor)

    // bind camera if needed
    if (mesh.material.options.rendering.useProjection) {
      pass.setBindGroup(this.cameraBindGroup.index, this.cameraBindGroup.bindGroup)
    }

    mesh.render(pass)
    pass.end()
  }

  /**
   * [Update the camera]{@link GPUCameraRenderer#updateCamera} and then call our [super render method]{@link GPURenderer#render}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   */
  render(commandEncoder: GPUCommandEncoder) {
    if (!this.ready) return

    this.updateCamera()
    super.render(commandEncoder)
  }

  /**
   * Destroy our {@link GPUCameraRenderer}
   */
  destroy() {
    this.cameraBindGroup?.destroy()
    super.destroy()
  }
}
