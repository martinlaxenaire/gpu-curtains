import { Shadow, ShadowBaseParams, shadowStruct } from './Shadow'
import { CameraRenderer } from '../renderers/utils'
import { Mat4, PerspectiveProjectionParams } from '../../math/Mat4'
import { Vec3 } from '../../math/Vec3'
import { Texture } from '../textures/Texture'
import { getDefaultPointShadowDepthFs, getDefaultPointShadowDepthVs } from '../shaders/chunks/shading/shadows'
import { PointLight } from '../lights/PointLight'
import { Input } from '../../types/BindGroups'
import { ShaderOptions } from '../../types/Materials'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/** Defines the perspective shadow camera params. */
export type PerspectiveShadowCameraParams = Omit<PerspectiveProjectionParams, 'fov' | 'aspect'>

/** Defines the perspective shadow camera. */
export interface PerspectiveShadowCamera extends PerspectiveShadowCameraParams {
  /** @ignore */
  _near: number
  /** @ignore */
  _far: number
  /** Perspective camera projection {@link Mat4}. */
  projectionMatrix: Mat4
  /** Array of 6 view {@link Mat4} corresponding to each faces of a cube. */
  viewMatrices: Mat4[]
}

/**
 * Base parameters used to create a {@link PointShadow}.
 */
export interface PointShadowParams extends ShadowBaseParams {
  /** {@link PointLight} used to create the {@link PointShadow}. */
  light: PointLight
  /** {@link PerspectiveShadowCameraParams | Perspective projection parameters} to use. */
  camera?: PerspectiveShadowCameraParams
}

/** @ignore */
export const pointShadowStruct: Record<string, Input> = {
  face: {
    type: 'i32',
    value: 0,
  },
  ...shadowStruct,
  cameraNear: {
    type: 'f32',
    value: 0,
  },
  cameraFar: {
    type: 'f32',
    value: 0,
  },
  projectionMatrix: {
    type: 'mat4x4f',
    value: new Float32Array(16),
  },
  viewMatrices: {
    type: 'array<mat4x4f>',
    value: new Float32Array(16 * 6),
  },
}

/**
 * Create a shadow map from a {@link PointLight} by rendering to a depth cube texture using an array of view {@link Mat4} based on the {@link PointLight} position and a {@link PerspectiveShadowCamera | perspective shadow camera} {@link Mat4}.
 *
 * This type of shadow is more expensive than {@link core/shadows/DirectionalShadow.DirectionalShadow | DirectionalShadow} since its scene needs to be rendered 6 times to each face of a depth cube texture instead of once.
 */
export class PointShadow extends Shadow {
  /** {@link PointLight} associated with this {@link PointShadow}. */
  light: PointLight

  /** {@link PerspectiveShadowCamera | Perspective shadow camera} to use for shadow calculations. */
  camera: PerspectiveShadowCamera

  /** Options used to create this {@link PointShadow}. */
  options: PointShadowParams

  /** Array of {@link Vec3} representing each cube face up directions to compute the {@link PointShadow#camera.viewMatrices | camera view matrices}. */
  cubeUps: Vec3[]
  /** Array of {@link Vec3} representing each cube face directions to compute the {@link PointShadow#camera.viewMatrices | camera view matrices}. */
  cubeDirections: Vec3[]
  /**
   * {@link Vec3} used to calculate the actual current direction based on the {@link PointLight} position.
   * @private
   */
  #tempCubeDirection: Vec3

  /**
   * PointShadow constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link PointShadow}.
   * @param parameters - {@link PointShadowParams | parameters} used to create this {@link PointShadow}.
   */
  constructor(
    renderer: CameraRenderer | GPUCurtains,
    {
      light,
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
      autoRender,
      camera = {
        near: 0.1,
        far: 150,
      },
    } = {} as PointShadowParams
  ) {
    super(renderer, {
      light,
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
      autoRender,
    })

    this.options = {
      ...this.options,
      camera,
    }

    //this.setRendererBinding()

    this.cubeDirections = [
      new Vec3(-1, 0, 0),
      new Vec3(1, 0, 0),
      new Vec3(0, -1, 0),
      new Vec3(0, 1, 0),
      new Vec3(0, 0, -1),
      new Vec3(0, 0, 1),
    ]

    this.#tempCubeDirection = new Vec3()

    this.cubeUps = [
      new Vec3(0, -1, 0),
      new Vec3(0, -1, 0),
      new Vec3(0, 0, 1),
      new Vec3(0, 0, -1),
      new Vec3(0, -1, 0),
      new Vec3(0, -1, 0),
    ]

    if (camera.far <= 0) {
      camera.far = 150
    }

    this.camera = {
      projectionMatrix: new Mat4(),
      viewMatrices: [],
      _near: camera.near,
      _far: camera.far,
    }

    for (let i = 0; i < 6; i++) {
      this.camera.viewMatrices.push(new Mat4())
    }

    // camera props getters and setters
    const _self = this
    const cameraProps = ['near', 'far'] as Array<keyof PerspectiveShadowCameraParams>

    cameraProps.forEach((prop) => {
      Object.defineProperty(_self.camera, prop, {
        get() {
          return _self.camera['_' + prop]
        },
        set(v) {
          _self.camera['_' + prop] = v
          _self.updateProjectionMatrix()
        },
      })
    })
  }

  /**
   * Set or reset this {@link PointShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  setRendererBinding() {
    this.rendererBinding = this.renderer.bindings.pointShadows
  }

  /**
   * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
   * Called internally by the associated {@link PointLight} if any shadow parameters are specified when creating it. Can also be called directly.
   * @param parameters - parameters to use for this {@link PointShadow}.
   */
  cast(
    { intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender, camera } = {} as Omit<
      PointShadowParams,
      'light'
    >
  ) {
    if (camera) {
      this.camera.near = camera.near ?? 0.1
      this.camera.far = camera.far !== undefined ? camera.far : this.light.range > 0 ? this.light.range : 150
    }

    super.cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender })
  }

  /**
   * Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget}, compute the {@link PointShadow#camera.projectionMatrix | camera projection matrix} and start rendering to the shadow map.
   */
  init() {
    super.init()
    this.updateProjectionMatrix()
  }

  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link PointLight} has been overflowed.
   */
  reset() {
    this.setRendererBinding()
    super.reset()
    // no need to update view matrices, they are handled by the parent PointLight reset call
    this.updateProjectionMatrix()
  }

  /**
   * Update the {@link PointShadow#camera.projectionMatrix | camera perspective projection matrix} and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  updateProjectionMatrix() {
    this.camera.projectionMatrix.identity().makePerspective({
      near: this.camera.near,
      far: this.camera.far,
      fov: 90,
      aspect: 1,
    })

    this.onPropertyChanged('projectionMatrix', this.camera.projectionMatrix)
    this.onPropertyChanged('cameraNear', this.camera.near)
    this.onPropertyChanged('cameraFar', this.camera.far)
  }

  /**
   * Update the {@link PointShadow#camera.viewMatrices | camera view matrices} and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param position - {@link Vec3} to use as position for the {@link PointShadow#camera.viewMatrices | camera view matrices}, based on the {@link light} position.
   */
  updateViewMatrices(position = new Vec3()) {
    for (let i = 0; i < 6; i++) {
      this.#tempCubeDirection.copy(this.cubeDirections[i]).add(position)
      this.camera.viewMatrices[i].makeView(position, this.#tempCubeDirection, this.cubeUps[i])

      for (let j = 0; j < 16; j++) {
        this.rendererBinding.childrenBindings[this.index].inputs.viewMatrices.value[i * 16 + j] =
          this.camera.viewMatrices[i].elements[j]
      }
    }

    this.rendererBinding.childrenBindings[this.index].inputs.viewMatrices.shouldUpdate = true
  }

  /**
   * Set or resize the {@link depthTexture} and eventually resize the {@link depthPassTarget} as well.
   */
  setDepthTexture() {
    if (
      this.depthTexture &&
      (this.depthTexture.size.width !== this.depthTextureSize.x ||
        this.depthTexture.size.height !== this.depthTextureSize.y)
    ) {
      const maxSize = Math.max(this.depthTextureSize.x, this.depthTextureSize.y)
      this.depthTexture.options.fixedSize.width = maxSize
      this.depthTexture.options.fixedSize.height = maxSize
      this.depthTexture.size.width = maxSize
      this.depthTexture.size.height = maxSize
      this.depthTexture.createTexture()

      if (this.depthPassTarget) {
        this.depthPassTarget.resize()
      }
    } else if (!this.depthTexture) {
      this.createDepthTexture()
    }
  }

  /**
   * Create the cube {@link depthTexture}.
   */
  createDepthTexture() {
    const maxSize = Math.max(this.depthTextureSize.x, this.depthTextureSize.y)
    this.depthTexture = new Texture(this.renderer, {
      label: `${this.constructor.name} (index: ${this.index}) depth texture`,
      name: 'pointShadowCubeDepthTexture' + this.index,
      type: 'depth',
      format: this.depthTextureFormat,
      viewDimension: 'cube',
      sampleCount: this.sampleCount,
      fixedSize: {
        width: maxSize,
        height: maxSize,
      },
      autoDestroy: false, // do not destroy when removing a mesh
    })
  }

  /**
   * Remove the depth pass from its {@link utils/TasksQueueManager.TasksQueueManager | task queue manager}.
   * @param depthPassTaskID - Task queue manager ID to use for removal.
   */
  removeDepthPass(depthPassTaskID) {
    this.renderer.onBeforeCommandEncoderCreation.remove(depthPassTaskID)
  }

  /**
   * Render the depth pass. This happens before creating the {@link CameraRenderer} command encoder.<br>
   * - Force all the {@link meshes} to use their depth materials
   * - For each face of the depth cube texture:
   *   - Create a command encoder.
   *   - Set the {@link depthPassTarget} descriptor depth texture view to our depth cube texture current face.
   *   - Update the face index
   *   - Render all the {@link meshes}
   *   - Submit the command encoder
   * - Reset all the {@link meshes} materials to their original one.
   * @param once - Whether to render it only once or not.
   */
  render(once = false): number {
    // TODO once multi-view is available,
    // we'll be able to use a single render pass
    // to render to all 6 faces of the cube depth map
    // see https://kidrigger.dev/post/vulkan-render-to-cubemap-using-multiview/
    return this.renderer.onBeforeCommandEncoderCreation.add(
      () => {
        if (!this.meshes.size) return

        // since we're not inside the main loop,
        // we need to be sure the renderer camera & lights bind group has been created
        this.renderer.setCameraBindGroup()

        // assign depth material to meshes
        this.useDepthMaterials()

        for (let i = 0; i < 6; i++) {
          const commandEncoder = this.renderer.device.createCommandEncoder()

          if (!this.renderer.production)
            commandEncoder.pushDebugGroup(
              `${this.constructor.name} (index: ${this.index}): depth pass command encoder for face ${i}`
            )

          this.depthPassTarget.renderPass.setRenderPassDescriptor(
            this.depthTexture.texture.createView({
              label: this.depthTexture.texture.label + ' cube face view ' + i,
              dimension: '2d',
              arrayLayerCount: 1,
              baseArrayLayer: i,
            })
          )

          // update face index
          this.rendererBinding.childrenBindings[this.index].inputs.face.value = i

          // again, we're not inside the main loop,
          // we need to explicitly update the renderer camera & lights bind group
          this.renderer.shouldUpdateCameraLightsBindGroup()
          this.renderer.updateCameraLightsBindGroup()

          this.renderDepthPass(commandEncoder)

          if (!this.renderer.production) commandEncoder.popDebugGroup()

          const commandBuffer = commandEncoder.finish()
          this.renderer.device.queue.submit([commandBuffer])
        }

        // reset depth meshes material to use the original
        // so the scene renders them normally
        this.useOriginalMaterials()

        // reset renderer current pipeline again
        this.renderer.pipelineManager.resetCurrentPipeline()
      },
      {
        once,
        order: this.index,
      }
    )
  }

  /**
   * Get the default depth pass vertex shader for this {@link PointShadow}.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs(hasInstances = false): ShaderOptions {
    return {
      /** Returned code. */
      code: getDefaultPointShadowDepthVs(this.index, hasInstances),
    }
  }

  /**
   * Get the default depth pass {@link types/Materials.ShaderOptions | fragment shader options} for this {@link PointShadow}.
   * @returns - A {@link types/Materials.ShaderOptions | ShaderOptions} with the depth pass fragment shader.
   */
  getDefaultShadowDepthFs(): ShaderOptions {
    return {
      /** Returned code. */
      code: getDefaultPointShadowDepthFs(this.index),
    }
  }
}
