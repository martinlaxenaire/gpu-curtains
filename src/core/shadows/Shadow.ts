import { CameraRenderer, isCameraRenderer } from '../renderers/utils'
import { Vec2 } from '../../math/Vec2'
import { Mat4 } from '../../math/Mat4'
import { Texture } from '../textures/Texture'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { Sampler } from '../samplers/Sampler'
import { ProjectedMesh } from '../renderers/GPURenderer'
import { RenderMaterial } from '../materials/RenderMaterial'
import { DirectionalLight } from '../lights/DirectionalLight'
import { PointLight } from '../lights/PointLight'
import { getDefaultShadowDepthVs } from '../shaders/chunks/utils/shadows'
import { BufferBinding } from '../bindings/BufferBinding'
import { RenderMaterialParams, ShaderOptions } from '../../types/Materials'
import { Input } from '../../types/BindGroups'

/** Defines all types of shadows. */
export type ShadowsType = 'directionalShadows' | 'pointShadows'

export const shadowStruct: Record<string, Input> = {
  isActive: {
    type: 'i32',
    value: 0,
  },
  pcfSamples: {
    type: 'i32',
    value: 0,
  },
  bias: {
    type: 'f32',
    value: 0,
  },
  normalBias: {
    type: 'f32',
    value: 0,
  },
  intensity: {
    type: 'f32',
    value: 0,
  },
}

/**
 * Base parameters used to create a {@link Shadow}.
 */
export interface ShadowBaseParams {
  /** Intensity of the shadow in the [0, 1] range. Default to `1`. */
  intensity?: number
  /** Shadow map bias. Default to `0`. */
  bias?: number
  /** Shadow map normal bias. Default to `0`. */
  normalBias?: number
  /** Number of samples to use for Percentage Closer Filtering calculations in the shader. Increase for smoother shadows, at the cost of performance. Default to `1`. */
  pcfSamples?: number
  /** Size of the depth {@link Texture} to use. Default to `Vec2(512)`. */
  depthTextureSize?: Vec2
  /** Format of the  depth {@link Texture} to use. Default to `depth24plus`. */
  depthTextureFormat?: GPUTextureFormat
  /** The {@link core/lights/Light.Light | light} that will be used to cast shadows. */
  light: DirectionalLight | PointLight
}

/**
 * Used as a base class to create a shadow map.
 *
 * A {@link Shadow} creates a {@link depthTexture | depth Texture} (that can vary based on the light type) and a {@link depthComparisonSampler | depth comparison Sampler}.
 *
 * Each {@link ProjectedMesh | Mesh} added to the {@link Shadow} will be rendered beforehand to the {@link depthTexture} using a {@link depthPassTarget | RenderTarget} and a custom {@link RenderMaterial}.
 */
export class Shadow {
  /** The {@link CameraRenderer} used to create this {@link Shadow}. */
  renderer: CameraRenderer
  /** Index of this {@link Shadow} used in the corresponding {@link CameraRenderer} shadow buffer binding. */
  index: number

  /** The {@link core/lights/Light.Light | light} that will be used to cast shadows. */
  light: DirectionalLight | PointLight

  /** Options used to create this {@link Shadow}. */
  options: ShadowBaseParams

  /** Sample count of the {@link depthTexture}. Only `1` is accepted for now. */
  sampleCount: number

  /** @ignore */
  #intensity: number
  /** @ignore */
  #bias: number
  /** @ignore */
  #normalBias: number
  /** @ignore */
  #pcfSamples: number
  /** Size of the depth {@link Texture} to use. Default to `Vec2(512)`. */
  depthTextureSize: Vec2
  /** Format of the  depth {@link Texture} to use. Default to `depth24plus`. */
  depthTextureFormat: GPUTextureFormat

  /** @ignore */
  #isActive: boolean

  /** Depth {@link Texture} used to create the shadow map. */
  depthTexture: null | Texture
  /** Depth {@link RenderTarget} onto which the {@link meshes} will be rendered. */
  depthPassTarget: null | RenderTarget
  /** Depth comparison {@link Sampler} used to compare depth in the shaders. */
  depthComparisonSampler: null | Sampler

  /** All the current {@link ProjectedMesh | meshes} rendered to the shadow map. */
  meshes: Map<ProjectedMesh['uuid'], ProjectedMesh>
  /**
   * Original {@link meshes} {@link RenderMaterial | materials}.
   * @private
   */
  #materials: Map<ProjectedMesh['uuid'], RenderMaterial>
  /**
   * Corresponding depth {@link meshes} {@link RenderMaterial | materials}.
   * @private
   */
  #depthMaterials: Map<ProjectedMesh['uuid'], RenderMaterial>
  /** @ignore */
  #depthPassTaskID: null | number

  /** {@link CameraRenderer} corresponding {@link BufferBinding} that holds all the bindings to send to the shaders. */
  rendererBinding: BufferBinding | null

  /**
   * Shadow constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link Shadow}.
   * @param parameters - {@link ShadowBaseParams | parameters} used to create this {@link Shadow}.
   */
  constructor(
    renderer: CameraRenderer,
    {
      light,
      intensity = 1,
      bias = 0,
      normalBias = 0,
      pcfSamples = 1,
      depthTextureSize = new Vec2(512),
      depthTextureFormat = 'depth24plus' as GPUTextureFormat,
    } = {} as ShadowBaseParams
  ) {
    renderer = isCameraRenderer(renderer, this.constructor.name)

    this.renderer = renderer

    this.rendererBinding = null

    this.light = light

    this.index = this.light.index

    this.options = {
      light,
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
    }

    // mandatory so we could use textureSampleCompare()
    // if we'd like to use MSAA, we would have to use an additional pass
    // to manually resolve the depth texture before using it
    this.sampleCount = 1

    this.meshes = new Map()
    this.#materials = new Map()
    this.#depthMaterials = new Map()

    this.#depthPassTaskID = null

    this.#setParameters({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat })

    this.isActive = false
  }

  /**
   * Set the {@link Shadow} parameters.
   * @param parameters - parameters to use for this {@link Shadow}.
   * @private
   */
  #setParameters(
    {
      intensity = 1,
      bias = 0,
      normalBias = 0,
      pcfSamples = 1,
      depthTextureSize = new Vec2(512),
      depthTextureFormat = 'depth24plus',
    } = {} as Omit<ShadowBaseParams, 'light'>
  ) {
    this.intensity = intensity
    this.bias = bias
    this.normalBias = normalBias
    this.pcfSamples = pcfSamples
    this.depthTextureSize = depthTextureSize
    this.depthTextureSize.onChange(() => this.onDepthTextureSizeChanged())
    this.depthTextureFormat = depthTextureFormat as GPUTextureFormat
  }

  /**
   * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
   * Called internally by the associated {@link core/lights/Light.Light | Light} if any shadow parameters are specified when creating it. Can also be called directly.
   * @param parameters - parameters to use for this {@link Shadow}.
   */
  cast(
    { intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat } = {} as Omit<
      ShadowBaseParams,
      'light'
    >
  ) {
    this.isActive = true
    this.#setParameters({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat })
  }

  /** @ignore */
  setRendererBinding() {}

  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link BufferBinding}. Called when the maximum number of corresponding {@link core/lights/Light.Light | lights} has been overflowed.
   */
  reset() {
    if (this.isActive) {
      this.updateShadowProperty('isActive', 1)
      this.updateShadowProperty('intensity', this.intensity)
      this.updateShadowProperty('bias', this.bias)
      this.updateShadowProperty('normalBias', this.normalBias)
      this.updateShadowProperty('pcfSamples', this.pcfSamples)
    }
  }

  /**
   * Get whether this {@link Shadow} is actually casting shadows.
   * @returns - Whether this {@link Shadow} is actually casting shadows.
   */
  get isActive(): boolean {
    return this.#isActive
  }

  /**
   * Start or stop casting shadows.
   * @param value
   */
  set isActive(value: boolean) {
    if (!value && this.isActive) {
      this.destroy()
    } else if (value && !this.isActive) {
      this.init()
    }

    this.#isActive = value
  }

  /**
   * Get this {@link Shadow} intensity.
   * @returns - The {@link Shadow} intensity.
   */
  get intensity(): number {
    return this.#intensity
  }

  /**
   * Set this {@link Shadow} intensity and update the {@link CameraRenderer} corresponding {@link BufferBinding}.
   * @param value - The new {@link Shadow} intensity.
   */
  set intensity(value: number) {
    this.#intensity = value
    if (this.isActive) this.updateShadowProperty('intensity', this.intensity)
  }

  /**
   * Get this {@link Shadow} bias.
   * @returns - The {@link Shadow} bias.
   */
  get bias(): number {
    return this.#bias
  }

  /**
   * Set this {@link Shadow} bias and update the {@link CameraRenderer} corresponding {@link BufferBinding}..
   * @param value - The new {@link Shadow} bias.
   */
  set bias(value: number) {
    this.#bias = value
    if (this.isActive) this.updateShadowProperty('bias', this.bias)
  }

  /**
   * Get this {@link Shadow} normal bias.
   * @returns - The {@link Shadow} normal bias.
   */
  get normalBias(): number {
    return this.#normalBias
  }

  /**
   * Set this {@link Shadow} normal bias and update the {@link CameraRenderer} corresponding {@link BufferBinding}..
   * @param value - The new {@link Shadow} normal bias.
   */
  set normalBias(value: number) {
    this.#normalBias = value
    if (this.isActive) this.updateShadowProperty('normalBias', this.normalBias)
  }

  /**
   * Get this {@link Shadow} PCF samples count.
   * @returns - The {@link Shadow} PCF samples count.
   */
  get pcfSamples(): number {
    return this.#pcfSamples
  }

  /**
   * Set this {@link Shadow} PCF samples count and update the {@link CameraRenderer} corresponding {@link BufferBinding}..
   * @param value - The new {@link Shadow} PCF samples count.
   */
  set pcfSamples(value: number) {
    this.#pcfSamples = Math.max(1, Math.ceil(value))
    if (this.isActive) this.updateShadowProperty('pcfSamples', this.pcfSamples)
  }

  /**
   * Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget} and start rendering to the shadow map.
   */
  init() {
    if (!this.depthComparisonSampler) {
      const samplerExists = this.renderer.samplers.find((sampler) => sampler.name === 'depthComparisonSampler')

      this.depthComparisonSampler =
        samplerExists ||
        new Sampler(this.renderer, {
          label: 'Depth comparison sampler',
          name: 'depthComparisonSampler',
          // we do not want to repeat the shadows
          addressModeU: 'clamp-to-edge',
          addressModeV: 'clamp-to-edge',
          compare: 'less',
          minFilter: 'linear',
          magFilter: 'linear',
          type: 'comparison',
        })
    }

    this.setDepthTexture()

    if (!this.depthPassTarget) {
      this.createDepthPassTarget()
    }

    if (this.#depthPassTaskID === null) {
      this.setDepthPass()
    }

    this.updateShadowProperty('isActive', 1)
  }

  /**
   * Reset the {@link depthTexture} when the {@link depthTextureSize} changes.
   */
  onDepthTextureSizeChanged() {
    this.setDepthTexture()
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
      this.depthTexture.options.fixedSize.width = this.depthTextureSize.x
      this.depthTexture.options.fixedSize.height = this.depthTextureSize.y
      this.depthTexture.size.width = this.depthTextureSize.x
      this.depthTexture.size.height = this.depthTextureSize.y
      this.depthTexture.createTexture()

      if (this.depthPassTarget) {
        this.depthPassTarget.resize()
      }
    } else if (!this.depthTexture) {
      this.createDepthTexture()
    }
  }

  /**
   * Create the {@link depthTexture}.
   */
  createDepthTexture() {
    this.depthTexture = new Texture(this.renderer, {
      label: 'Shadow depth texture ' + this.index,
      name: 'shadowDepthTexture' + this.index,
      type: 'depth',
      format: this.depthTextureFormat,
      sampleCount: this.sampleCount,
      fixedSize: {
        width: this.depthTextureSize.x,
        height: this.depthTextureSize.y,
      },
    })
  }

  /**
   * Create the {@link depthPassTarget}.
   */
  createDepthPassTarget() {
    this.depthPassTarget = new RenderTarget(this.renderer, {
      label: 'Depth pass render target for ' + this.constructor.name + ' ' + this.index,
      useColorAttachments: false,
      depthTexture: this.depthTexture,
      sampleCount: this.sampleCount,
    })
  }

  /**
   * Update the {@link CameraRenderer} corresponding {@link BufferBinding} input value and tell the {@link CameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows} bind group to update.
   * @param propertyKey - name of the property to update.
   * @param value - new value of the property.
   */
  updateShadowProperty(propertyKey: string, value: Mat4 | number) {
    if (this.rendererBinding) {
      if (value instanceof Mat4) {
        for (let i = 0; i < value.elements.length; i++) {
          this.rendererBinding.bindings[this.index].inputs[propertyKey].value[i] = value.elements[i]
        }

        this.rendererBinding.bindings[this.index].inputs[propertyKey].shouldUpdate = true
      } else {
        this.rendererBinding.bindings[this.index].inputs[propertyKey].value = value
      }

      this.renderer.shouldUpdateCameraLightsBindGroup()
    }
  }

  /**
   * Start the depth pass.
   */
  setDepthPass() {
    // add the depth pass (rendered each tick before our main scene)
    this.#depthPassTaskID = this.depthPassTask()
  }

  /**
   * Remove the depth pass from its {@link utils/TaskQueueManager.TaskQueueManager | task queue manager}.
   * @param depthPassTaskID - Task queue manager ID to use for removal.
   */
  removeDepthPass(depthPassTaskID) {
    this.renderer.onBeforeRenderScene.remove(depthPassTaskID)
  }

  /**
   * Render the depth pass. This happens before rendering the {@link CameraRenderer#scene | scene}.<br>
   * - Force all the {@link meshes} to use their depth materials
   * - Render all the {@link meshes}
   * - Reset all the {@link meshes} materials to their original one.
   */
  depthPassTask(): number {
    return this.renderer.onBeforeRenderScene.add(
      (commandEncoder) => {
        if (!this.meshes.size) return

        // assign depth material to meshes
        this.useDepthMaterials()

        this.renderDepthPass(commandEncoder)

        // reset depth meshes material to use the original
        // so the scene renders them normally
        this.useOriginalMaterials()

        // reset renderer current pipeline again
        this.renderer.pipelineManager.resetCurrentPipeline()
      },
      {
        order: this.index,
      }
    )
  }

  /**
   * Render all the {@link meshes} into the {@link depthPassTarget}.
   * @param commandEncoder - {@link GPUCommandEncoder} to use.
   */
  renderDepthPass(commandEncoder: GPUCommandEncoder) {
    // reset renderer current pipeline
    this.renderer.pipelineManager.resetCurrentPipeline()

    // begin depth pass
    const depthPass = commandEncoder.beginRenderPass(this.depthPassTarget.renderPass.descriptor)

    // render meshes with their depth material
    this.meshes.forEach((mesh) => {
      if (mesh.ready) mesh.render(depthPass)
    })

    depthPass.end()
  }

  /**
   * Get the default depth pass vertex shader for this {@link Shadow}.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs(): string {
    return getDefaultShadowDepthVs(this.index)
  }

  /**
   * Get the default depth pass fragment shader for this {@link Shadow}.
   * @returns - A {@link ShaderOptions} if a depth pass fragment shader is needed, `false` otherwise.
   */
  getDefaultShadowDepthFs(): boolean | ShaderOptions {
    return false // we do not need to output to a fragment shader unless we do late Z writing
  }

  /**
   * Patch the given {@link ProjectedMesh | mesh} material parameters to create the depth material.
   * @param mesh - original {@link ProjectedMesh | mesh} to use.
   * @param parameters - Optional additional parameters to use for the depth material.
   * @returns - Patched parameters.
   */
  patchShadowCastingMeshParams(mesh: ProjectedMesh, parameters: RenderMaterialParams = {}): RenderMaterialParams {
    if (!parameters.shaders) {
      parameters.shaders = {
        vertex: {
          code: this.getDefaultShadowDepthVs(),
        },
        fragment: this.getDefaultShadowDepthFs(),
      }
    }

    parameters = { ...mesh.material.options.rendering, ...parameters }

    // explicitly set empty output targets
    // we just want to write to the depth texture
    parameters.targets = []

    parameters.sampleCount = this.sampleCount
    parameters.depthFormat = this.depthTextureFormat

    if (parameters.bindings) {
      parameters.bindings = [mesh.material.getBufferBindingByName('matrices'), ...parameters.bindings]
    } else {
      parameters.bindings = [mesh.material.getBufferBindingByName('matrices')]
    }

    return parameters
  }

  /**
   * Add a {@link ProjectedMesh | mesh} to the shadow map. Internally called by the {@link ProjectedMesh | mesh} if its `castShadows` parameters has been set to `true`, but can also be called externally to selectively cast shadows or to add specific parameters (such as custom depth pass shaders).
   * - Save the original {@link ProjectedMesh | mesh} material.
   * - {@link patchShadowCastingMeshParams | Patch} the parameters.
   * - Create a new depth {@link RenderMaterial} with the patched parameters.
   * - Add the {@link ProjectedMesh | mesh} to the {@link meshes} Map.
   * @param mesh - {@link ProjectedMesh | mesh} to add to the shadow map.
   * @param parameters - Optional {@link RenderMaterialParams | parameters} to use for the depth material.
   */
  addShadowCastingMesh(mesh: ProjectedMesh, parameters: RenderMaterialParams = {}) {
    mesh.options.castShadows = true

    this.#materials.set(mesh.uuid, mesh.material)

    parameters = this.patchShadowCastingMeshParams(mesh, parameters)

    if (this.#depthMaterials.get(mesh.uuid)) {
      this.#depthMaterials.get(mesh.uuid).destroy()
      this.#depthMaterials.delete(mesh.uuid)
    }

    this.#depthMaterials.set(
      mesh.uuid,
      new RenderMaterial(this.renderer, {
        label: mesh.options.label + ' depth render material',
        ...parameters,
      })
    )

    this.meshes.set(mesh.uuid, mesh)
  }

  /**
   * Force all the {@link meshes} to use the depth material.
   */
  useDepthMaterials() {
    this.meshes.forEach((mesh) => {
      mesh.useMaterial(this.#depthMaterials.get(mesh.uuid))
    })
  }

  /**
   * Force all the {@link meshes} to use their original material.
   */
  useOriginalMaterials() {
    this.meshes.forEach((mesh) => {
      mesh.useMaterial(this.#materials.get(mesh.uuid))
    })
  }

  /**
   * Remove a {@link ProjectedMesh | mesh} from the shadow map and destroy its depth material.
   * @param mesh - {@link ProjectedMesh | mesh} to remove.
   */
  removeMesh(mesh: ProjectedMesh) {
    const depthMaterial = this.#depthMaterials.get(mesh.uuid)

    if (depthMaterial) {
      depthMaterial.destroy()
      this.#depthMaterials.delete(mesh.uuid)
    }

    this.meshes.delete(mesh.uuid)
  }

  /**
   * Destroy the {@link Shadow}.
   */
  destroy() {
    this.updateShadowProperty('isActive', 0)

    if (this.#depthPassTaskID !== null) {
      this.removeDepthPass(this.#depthPassTaskID)
      this.#depthPassTaskID = null
    }

    this.meshes.forEach((mesh) => this.removeMesh(mesh))
    this.#materials = new Map()
    this.#depthMaterials = new Map()
    this.meshes = new Map()

    this.depthPassTarget?.destroy()
    this.depthTexture?.destroy()
  }
}
