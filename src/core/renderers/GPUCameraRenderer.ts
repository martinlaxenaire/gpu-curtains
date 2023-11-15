import { GPURenderer, GPURendererParams } from './GPURenderer'
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
 * This renderer also creates a {@link Camera} and its associated [bindings]{@link GPUCameraRenderer#cameraBufferBinding} and [bind group]{@link GPUCameraRenderer#cameraBindGroup}
 * @extends GPURenderer
 */
export class GPUCameraRenderer extends GPURenderer {
  /** {@link Camera} used by this {@link GPUCameraRenderer} */
  camera: Camera
  /** [bindings]{@link BufferBinding} handling the [camera]{@link GPUCameraRenderer#camera} matrices */
  cameraBufferBinding: BufferBinding
  /** [bind group]{@link BindGroup} handling the [camera buffer bindings]{@link GPUCameraRenderer#cameraBufferBinding} */
  cameraBindGroup: BindGroup

  /**
   * GPUCameraRenderer constructor
   * @param parameters - [parameters]{@link GPUCameraRendererParams} used to create this {@link GPUCameraRenderer}
   */
  constructor({
    container,
    pixelRatio = 1,
    sampleCount = 4,
    preferredFormat,
    production = false,
    camera = {},
    onError = () => {
      /* allow empty callbacks */
    },
  }: GPUCameraRendererParams) {
    super({ container, pixelRatio, sampleCount, preferredFormat, production, onError })

    // this.options = {
    //   container,
    //   pixelRatio,
    //   sampleCount,
    //   preferredFormat,
    //   production,
    //   camera,
    // }

    this.type = 'GPUCameraRenderer'

    camera = { ...{ fov: 50, near: 0.01, far: 50 }, ...camera }
    this.setCamera(camera)
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
      // TODO is this still needed after all?
      // onPerspectiveChanged: () => {
      //   this.planes?.forEach((plane) => plane.updateSizePositionAndProjection())
      // },
      onPositionChanged: () => {
        this.onCameraPositionChanged()
      },
    })

    this.setCameraBufferBinding()
  }

  /**
   * Callback to run each time the [camera]{@link GPUCameraRenderer#camera} position changes
   */
  onCameraPositionChanged() {
    this.setPerspective()
  }

  /**
   * Set the [camera buffer bindings]{@link GPUCameraRenderer#cameraBufferBinding} and [camera bind group]{@link GPUCameraRenderer#cameraBindGroup}
   */
  setCameraBufferBinding() {
    this.cameraBufferBinding = new BufferBinding({
      label: 'Camera',
      name: 'camera',
      visibility: 'vertex',
      bindings: {
        model: {
          // camera model matrix
          name: 'model',
          type: 'mat4x4f',
          value: this.camera.modelMatrix,
          onBeforeUpdate: () => {
            this.cameraBufferBinding.bindings.model.value = this.camera.modelMatrix
          },
        },
        view: {
          // camera view matrix
          name: 'view',
          type: 'mat4x4f',
          value: this.camera.viewMatrix,
          onBeforeUpdate: () => {
            this.cameraBufferBinding.bindings.view.value = this.camera.viewMatrix
          },
        },
        projection: {
          // camera projection matrix
          name: 'projection',
          type: 'mat4x4f',
          value: this.camera.projectionMatrix,
          onBeforeUpdate: () => {
            this.cameraBufferBinding.bindings.projection.value = this.camera.projectionMatrix
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
   * Tell our [camera buffer bindings]{@link GPUCameraRenderer#cameraBufferBinding} that we should update its bindings
   */
  updateCameraMatrixStack() {
    this.cameraBufferBinding?.shouldUpdateBinding('model')
    this.cameraBufferBinding?.shouldUpdateBinding('view')
    this.cameraBufferBinding?.shouldUpdateBinding('projection')
  }

  /**
   * Set our [camera]{@link GPUCameraRenderer#camera} perspective matrix new parameters (fov, near plane and far plane)
   * @param fov - new [field of view]{@link Camera#fov}
   * @param near - new [near plane]{@link Camera#near}
   * @param far - new [far plane]{@link Camera#far}
   */
  setPerspective(fov?: number, near?: number, far?: number) {
    this.camera?.setPerspective(fov, near, far, this.boundingRect.width, this.boundingRect.height, this.pixelRatio)
  }

  /**
   * Set our [camera]{@link GPUCameraRenderer#camera} position
   * @param position - new [position]{@link Camera#position}
   */
  setCameraPosition(position: Vec3 = new Vec3(0, 0, 1)) {
    this.camera.setPosition(position)
  }

  /**
   * Call our [super onResize method]{@link GPURenderer#onResize} and resize our [camera]{@link GPUCameraRenderer#camera} as well
   */
  onResize() {
    super.onResize()
    this.setPerspective()
    this.updateCameraMatrixStack()
  }

  /**
   * Handle the camera [bind group]{@link GPUCameraRenderer#cameraBindGroup} and [bindings]{@link GPUCameraRenderer#cameraBufferBinding}, then call our [super render method]{@link GPURenderer#render}
   */
  render() {
    if (!this.ready) return

    this.cameraBufferBinding?.onBeforeRender()

    this.setCameraBindGroup()

    this.cameraBindGroup?.updateBufferBindings()

    super.render()
  }

  /**
   * Destroy our {@link GPUCameraRenderer}
   */
  destroy() {
    this.cameraBindGroup?.destroy()
    super.destroy()
  }
}
