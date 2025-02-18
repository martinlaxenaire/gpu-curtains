import { CameraRenderer, isCameraRenderer } from '../renderers/utils'
import { Vec2 } from '../../math/Vec2'
import { Mat4 } from '../../math/Mat4'
import { Texture } from '../textures/Texture'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { Sampler } from '../samplers/Sampler'
import { RenderMaterial } from '../materials/RenderMaterial'
import { ShadowCastingLights } from '../lights/Light'
import { BufferBinding } from '../bindings/BufferBinding'
import { RenderMaterialParams, ShaderOptions } from '../../types/Materials'
import { Input } from '../../types/BindGroups'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { VertexShaderInputBaseParams } from '../shaders/full/vertex/get-vertex-shader-code'
import { Mesh } from '../meshes/Mesh'
import { Geometry } from '../geometries/Geometry'

/** Defines all types of shadows. */
export type ShadowsType = 'directionalShadows' | 'pointShadows' | 'spotShadows'

/** @ignore */
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
  /** Whether the shadow should be automatically rendered each frame or not. Should be set to `false` if the scene is static and be rendered manually instead. Default to `true`. */
  autoRender?: boolean
  /** The {@link core/lights/Light.Light | light} that will be used to cast shadows. */
  light: ShadowCastingLights
}

/**
 * Used as a base class to create a shadow map.
 *
 * A {@link Shadow} creates a {@link depthTexture | depth Texture} (that can vary based on the light type) and a {@link depthComparisonSampler | depth comparison Sampler}.
 *
 * Each {@link Mesh} added to the {@link Shadow} will be rendered beforehand to the {@link depthTexture} using a {@link depthPassTarget | RenderTarget} and a custom {@link RenderMaterial}.
 */
export class Shadow {
  /** The {@link CameraRenderer} used to create this {@link Shadow}. */
  renderer: CameraRenderer
  /** Index of this {@link Shadow} used in the corresponding {@link CameraRenderer} shadow buffer binding. */
  index: number

  /** The {@link core/lights/Light.Light | light} that will be used to cast shadows. */
  light: ShadowCastingLights

  /** Options used to create this {@link Shadow}. */
  options: Omit<ShadowBaseParams, 'autoRender'>

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
  /** @ignore */
  #autoRender: boolean

  /** Depth {@link Texture} used to create the shadow map. */
  depthTexture: null | Texture
  /** Depth {@link RenderTarget} onto which the {@link castingMeshes} will be rendered. */
  depthPassTarget: null | RenderTarget
  /** Depth comparison {@link Sampler} used to compare depth in the shaders. */
  depthComparisonSampler: null | Sampler

  /** Map of all the parent {@link Mesh} casting shadows used to create the depth meshes. */
  castingMeshes: Map<Mesh['uuid'], Mesh>
  /** Map of all the depth {@link Mesh} rendered to the shadow map. */
  depthMeshes: Map<Mesh['uuid'], Mesh>
  /** Map of all the shadow receiving {@link Mesh}. */
  #receivingMeshes: Map<Mesh['uuid'], Mesh>

  /** {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} that holds all the bindings for this type of shadow to send to the shaders. */
  rendererBinding: BufferBinding | null

  /**
   * Shadow constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link Shadow}.
   * @param parameters - {@link ShadowBaseParams | parameters} used to create this {@link Shadow}.
   */
  constructor(
    renderer: CameraRenderer | GPUCurtains,
    {
      light,
      intensity = 1,
      bias = 0,
      normalBias = 0,
      pcfSamples = 1,
      depthTextureSize = new Vec2(512),
      depthTextureFormat = 'depth24plus' as GPUTextureFormat,
      autoRender = true,
    } = {} as ShadowBaseParams
  ) {
    this.setRenderer(renderer)

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

    this.castingMeshes = new Map()
    this.#receivingMeshes = new Map()
    this.depthMeshes = new Map()

    this.#setParameters({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender })

    this.isActive = false
  }

  /**
   * Set or reset this shadow {@link CameraRenderer}.
   * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer: CameraRenderer | GPUCurtains) {
    const oldRenderer = this.renderer

    renderer = isCameraRenderer(renderer, this.constructor.name)
    this.renderer = renderer

    this.setRendererBinding()

    if (this.depthPassTarget) {
      this.depthPassTarget.setRenderer(this.renderer)
    }

    // now the depth meshes
    // we need to check if the original shadow casting meshes belong to the new renderer?
    // of course this test can fail depending on the order of the operations...
    this.castingMeshes = new Map()
    this.renderer.meshes.forEach((mesh) => {
      if ('castShadows' in mesh.options && mesh.options.castShadows) {
        this.castingMeshes.set(mesh.uuid, mesh as Mesh)
      }
    })

    this.depthMeshes?.forEach((depthMesh) => {
      depthMesh.setRenderer(this.renderer)
    })

    if (oldRenderer) {
      this.reset()

      if (this.#autoRender) {
        this.setDepthPass()
      }
    }
  }

  /** @ignore */
  setRendererBinding() {
    this.rendererBinding = null
  }

  // TODO unused for now, should we really consider this case?
  // updateIndex(index: number) {
  //   const shouldUpdateIndex = index !== this.index
  //
  //   this.index = index
  //
  //   if (shouldUpdateIndex) {
  //     throwWarning(`This ${this.constructor.name} index has changed, the shaders need to be recreated`)
  //   }
  // }

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
      autoRender = true,
    } = {} as Omit<ShadowBaseParams, 'light'>
  ) {
    this.intensity = intensity
    this.bias = bias
    this.normalBias = normalBias
    this.pcfSamples = pcfSamples
    this.depthTextureSize = depthTextureSize
    this.depthTextureFormat = depthTextureFormat as GPUTextureFormat
    this.#autoRender = autoRender
  }

  /**
   * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
   * Called internally by the associated {@link core/lights/Light.Light | Light} if any shadow parameters are specified when creating it. Can also be called directly.
   * @param parameters - parameters to use for this {@link Shadow}.
   */
  cast(
    { intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender } = {} as Omit<
      ShadowBaseParams,
      'light'
    >
  ) {
    this.#setParameters({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender })
    this.isActive = true
  }

  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link core/lights/Light.Light | lights} has been overflowed or when the {@link renderer} has changed.
   */
  reset() {
    this.onPropertyChanged('isActive', this.isActive ? 1 : 0)
    if (this.isActive) {
      this.onPropertyChanged('intensity', this.intensity)
      this.onPropertyChanged('bias', this.bias)
      this.onPropertyChanged('normalBias', this.normalBias)
      this.onPropertyChanged('pcfSamples', this.pcfSamples)
    }
  }

  /**
   * Update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} input value and tell the {@link CameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows} bind group to update.
   * @param propertyKey - name of the property to update.
   * @param value - new value of the property.
   */
  onPropertyChanged(propertyKey: string, value: Mat4 | number) {
    if (this.rendererBinding && this.rendererBinding.childrenBindings.length > this.index) {
      if (value instanceof Mat4) {
        for (let i = 0; i < value.elements.length; i++) {
          this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].value[i] = value.elements[i]
        }

        this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].shouldUpdate = true
      } else {
        this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].value = value
      }

      this.renderer.shouldUpdateCameraLightsBindGroup()
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
   * @param value - New active state.
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
   * Set this {@link Shadow} intensity and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link Shadow} intensity.
   */
  set intensity(value: number) {
    this.#intensity = value
    this.onPropertyChanged('intensity', this.intensity)
  }

  /**
   * Get this {@link Shadow} bias.
   * @returns - The {@link Shadow} bias.
   */
  get bias(): number {
    return this.#bias
  }

  /**
   * Set this {@link Shadow} bias and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link Shadow} bias.
   */
  set bias(value: number) {
    this.#bias = value
    this.onPropertyChanged('bias', this.bias)
  }

  /**
   * Get this {@link Shadow} normal bias.
   * @returns - The {@link Shadow} normal bias.
   */
  get normalBias(): number {
    return this.#normalBias
  }

  /**
   * Set this {@link Shadow} normal bias and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link Shadow} normal bias.
   */
  set normalBias(value: number) {
    this.#normalBias = value
    this.onPropertyChanged('normalBias', this.normalBias)
  }

  /**
   * Get this {@link Shadow} PCF samples count.
   * @returns - The {@link Shadow} PCF samples count.
   */
  get pcfSamples(): number {
    return this.#pcfSamples
  }

  /**
   * Set this {@link Shadow} PCF samples count and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link Shadow} PCF samples count.
   */
  set pcfSamples(value: number) {
    this.#pcfSamples = Math.max(1, Math.ceil(value))
    this.onPropertyChanged('pcfSamples', this.pcfSamples)
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

    this.depthTextureSize.onChange(() => this.onDepthTextureSizeChanged())

    if (!this.depthPassTarget) {
      this.createDepthPassTarget()
    }

    if (this.#autoRender) {
      this.setDepthPass()
      // do net set active flag if it's not rendered
      this.onPropertyChanged('isActive', 1)
    }
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
    /* Will be overriden by child classes */
  }

  /** Destroy the {@link depthTexture}. */
  destroyDepthTexture() {
    this.depthTexture?.destroy()
    this.depthTexture = null
    this.depthTextureSize.onChange(() => {})
  }

  /**
   * Clear the content of the depth texture. Called whenever the {@link castingMeshes} {@link Map} is empty after having removed a mesh, or if all {@link castingMeshes} `visible` properties are `false`.
   */
  clearDepthTexture() {
    if (!this.depthTexture || !this.depthTexture.texture) return

    // Create a command encoder
    const commandEncoder = this.renderer.device.createCommandEncoder()
    !this.renderer.production &&
      commandEncoder.pushDebugGroup(`Clear ${this.depthTexture.texture.label} command encoder`)

    // Define the render pass descriptor
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [],
      depthStencilAttachment: {
        view: this.depthTexture.texture.createView({
          label: 'Clear ' + this.depthTexture.texture.label + ' view',
        }),
        depthLoadOp: 'clear', // Clear the depth attachment
        depthClearValue: 1.0, // Clear to the maximum depth (farthest possible depth)
        depthStoreOp: 'store', // Store the cleared depth
      },
    }

    // Begin the render pass
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
    // End the render pass (we don't need to draw anything, just clear)
    passEncoder.end()

    // Submit the command buffer
    !this.renderer.production && commandEncoder.popDebugGroup()
    this.renderer.device.queue.submit([commandEncoder.finish()])
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
      autoRender: this.#autoRender,
    })
  }

  /**
   * Set our {@link depthPassTarget} corresponding {@link CameraRenderer#scene | scene} render pass entry custom render pass.
   */
  setDepthPass() {
    // set the depth pass target render pass entry custom render pass function
    const renderPassEntry = this.renderer.scene.getRenderTargetPassEntry(this.depthPassTarget)
    renderPassEntry.useCustomRenderPass = (commandEncoder) => this.render(commandEncoder)
  }

  /**
   * Render the depth pass. Called by the {@link CameraRenderer#scene | scene} when rendering the {@link depthPassTarget} render pass entry, or by the {@link renderOnce} method.<br />
   * - Render all the depth meshes.
   * @param commandEncoder - {@link GPUCommandEncoder} to use.
   */
  render(commandEncoder: GPUCommandEncoder) {
    if (!this.castingMeshes.size) return

    let shouldRender = false
    for (const [_uuid, mesh] of this.castingMeshes) {
      if (mesh.visible) {
        shouldRender = true
        break
      }
    }

    // no visible meshes to draw
    if (!shouldRender) {
      this.clearDepthTexture()
      return
    }

    this.renderDepthPass(commandEncoder)

    // reset renderer current pipeline again
    this.renderer.pipelineManager.resetCurrentPipeline()
  }

  /**
   * Render the shadow map only once. Useful with static scenes if autoRender has been set to `false` to only take one snapshot of the shadow map.
   */
  async renderOnce(): Promise<void> {
    // no point if it's already rendered
    if (!this.#autoRender) {
      this.onPropertyChanged('isActive', 1)

      await Promise.all(
        [...this.depthMeshes.values()].map(async (depthMesh) => {
          depthMesh.setGeometry()
          await depthMesh.material.compileMaterial()
        })
      )

      this.renderer.onBeforeRenderScene.add(
        (commandEncoder) => {
          this.render(commandEncoder)
        },
        {
          once: true,
        }
      )
    }
  }

  /**
   * Render all the {@link castingMeshes} into the {@link depthPassTarget}.
   * @param commandEncoder - {@link GPUCommandEncoder} to use.
   */
  renderDepthPass(commandEncoder: GPUCommandEncoder) {
    // reset renderer current pipeline
    this.renderer.pipelineManager.resetCurrentPipeline()

    // begin depth pass
    const depthPass = commandEncoder.beginRenderPass(this.depthPassTarget.renderPass.descriptor)

    if (!this.renderer.production)
      depthPass.pushDebugGroup(`${this.constructor.name} (index: ${this.index}): depth pass`)

    // render depth meshes
    for (const [uuid, depthMesh] of this.depthMeshes) {
      // bail if original mesh is not visible
      if (!this.castingMeshes.get(uuid)?.visible) {
        continue
      }

      depthMesh.render(depthPass)
    }

    if (!this.renderer.production) depthPass.popDebugGroup()

    depthPass.end()
  }

  /**
   * Get the default depth pass vertex shader for this {@link Shadow}.
   * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs({ bindings = [], geometry }: VertexShaderInputBaseParams): ShaderOptions {
    return {
      /** Returned code. */
      code: `@vertex fn main(@location(0) position: vec4f) -> @builtin(position) vec4f { return position; }`,
    }
  }

  /**
   * Get the default depth pass fragment shader for this {@link Shadow}.
   * @returns - A {@link ShaderOptions} if a depth pass fragment shader is needed, `false` otherwise.
   */
  getDefaultShadowDepthFs(): false | ShaderOptions {
    return false // we do not need to output to a fragment shader unless we do late Z writing
  }

  /**
   * Patch the given {@link Mesh | mesh} material parameters to create the depth mesh.
   * @param mesh - original {@link Mesh | mesh} to use.
   * @param parameters - Optional additional parameters to use for the depth mesh.
   * @returns - Patched parameters.
   */
  patchShadowCastingMeshParams(mesh: Mesh, parameters: RenderMaterialParams = {}): RenderMaterialParams {
    parameters = { ...mesh.material.options.rendering, ...parameters }

    // eventual internal bindings
    const bindings: BufferBinding[] = []

    // eventually add skins and morph targets
    mesh.material.inputsBindings.forEach((binding) => {
      if (binding.name.includes('skin') || binding.name.includes('morphTarget')) {
        bindings.push(binding as BufferBinding)
      }
    })

    // eventually add instances as well
    const instancesBinding = mesh.material.getBufferBindingByName('instances')
    if (instancesBinding) {
      bindings.push(instancesBinding)
    }

    if (parameters.bindings) {
      parameters.bindings = [...bindings, ...parameters.bindings]
    } else {
      parameters.bindings = [...bindings]
    }

    if (!parameters.shaders) {
      parameters.shaders = {
        vertex: this.getDefaultShadowDepthVs({ bindings, geometry: mesh.geometry }),
        fragment: this.getDefaultShadowDepthFs(),
      }
    }

    return parameters
  }

  /**
   * Add a {@link Mesh} to the shadow map. Internally called by the {@link Mesh} if its `castShadows` parameters has been set to `true`, but can also be called externally to selectively cast shadows or to add specific parameters (such as custom depth pass shaders).
   * - {@link patchShadowCastingMeshParams | Patch} the parameters.
   * - Create a new depth {@link Mesh} with the patched parameters.
   * - Add the {@link Mesh} to the {@link castingMeshes} Map.
   * @param mesh - {@link Mesh} to add to the shadow map.
   * @param parameters - Optional {@link RenderMaterialParams | parameters} to use for the depth mesh.
   */
  addShadowCastingMesh(mesh: Mesh, parameters: RenderMaterialParams = {}) {
    // already there? bail
    if (this.castingMeshes.get(mesh.uuid)) return

    mesh.options.castShadows = true

    parameters = this.patchShadowCastingMeshParams(mesh, parameters)

    if (this.depthMeshes.get(mesh.uuid)) {
      this.depthMeshes.get(mesh.uuid).remove()
      this.depthMeshes.delete(mesh.uuid)
    }

    const depthMesh = new Mesh(this.renderer, {
      label: `${this.constructor.name} (index: ${this.index}) ${mesh.options.label} depth mesh`,
      ...parameters,
      geometry: mesh.geometry,
      // explicitly set empty output targets
      // we just want to write to the depth texture
      targets: [],
      outputTarget: this.depthPassTarget,
      frustumCulling: false, // draw shadow even if original mesh is hidden
      autoRender: this.#autoRender,
    })

    depthMesh.parent = mesh

    this.depthMeshes.set(mesh.uuid, depthMesh)

    this.castingMeshes.set(mesh.uuid, mesh)
  }

  /**
   * Add a shadow receiving {@link Mesh} to the #receivingMeshes {@link Map}.
   * @param mesh - Shadow receiving {@link Mesh} to add.
   */
  addShadowReceivingMesh(mesh: Mesh) {
    this.#receivingMeshes.set(mesh.uuid, mesh)
  }

  /**
   * Remove a shadow receiving {@link Mesh} from the #receivingMeshes {@link Map}.
   * @param mesh - Shadow receiving {@link Mesh} to remove.
   */
  removeShadowReceivingMesh(mesh: Mesh) {
    this.#receivingMeshes.delete(mesh.uuid)

    // shadow is inactive and there's no more receiving meshes?
    // destroy depth texture
    if (this.#receivingMeshes.size === 0 && !this.isActive) {
      this.destroyDepthTexture()
    }
  }

  /**
   * Remove a {@link Mesh} from the shadow map and destroy its depth mesh.
   * @param mesh - {@link Mesh} to remove.
   */
  removeMesh(mesh: Mesh) {
    const depthMesh = this.depthMeshes.get(mesh.uuid)

    if (depthMesh) {
      depthMesh.remove()
      this.depthMeshes.delete(mesh.uuid)
    }

    this.castingMeshes.delete(mesh.uuid)

    if (this.castingMeshes.size === 0) {
      this.clearDepthTexture()
    }
  }

  /**
   * If one of the {@link castingMeshes} had its geometry change, update the corresponding depth mesh geometry as well.
   * @param mesh - Original {@link Mesh} which geometry just changed.
   * @param geometry - New {@link Mesh} {@link Geometry} to use.
   */
  updateMeshGeometry(mesh: Mesh, geometry: Geometry) {
    const depthMesh = this.depthMeshes.get(mesh.uuid)

    if (depthMesh) {
      depthMesh.useGeometry(geometry)
    }
  }

  /**
   * Destroy the {@link Shadow}.
   */
  destroy() {
    this.onPropertyChanged('isActive', 0)
    this.#isActive = false

    this.castingMeshes.forEach((mesh) => this.removeMesh(mesh))
    this.castingMeshes = new Map()
    this.depthMeshes = new Map()

    this.depthPassTarget?.destroy()

    // only destroy depth texture if there's no receiving meshes
    if (this.#receivingMeshes.size === 0) {
      this.destroyDepthTexture()
    }
  }
}
