import { throwError, throwWarning } from '../../utils/utils'
import { Renderer } from './utils'
import { Sampler } from '../samplers/Sampler'
import { PipelineManager } from '../pipelines/PipelineManager'
import { SceneObject } from './GPURenderer'
import { DOMTexture } from '../textures/DOMTexture'
import { AllowedBindGroups } from '../../types/BindGroups'
import { Buffer } from '../buffers/Buffer'
import { BufferBinding } from '../bindings/BufferBinding'
import { IndirectBuffer } from '../../extras/buffers/IndirectBuffer'
import { Texture } from '../textures/Texture'

/**
 * Base parameters used to create a {@link GPUDeviceManager}
 */
export interface GPUDeviceManagerBaseParams {
  /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console */
  production?: boolean
  /** Additional options to use when requesting an {@link GPUAdapter | adapter} */
  adapterOptions?: GPURequestAdapterOptions
  /** Whether the {@link GPUDeviceManager} should create its own requestAnimationFrame loop to render or not */
  autoRender?: boolean
}

/**
 * Parameters used to create a {@link GPUDeviceManager}
 */
export interface GPUDeviceManagerParams extends GPUDeviceManagerBaseParams {
  /** The label of the {@link GPUDeviceManager}, used to create the {@link GPUDevice} for debugging purpose */
  label?: string
  /** Callback to run if there's any error while trying to set up the {@link GPUAdapter | adapter} or {@link GPUDevice | device} */
  onError?: () => void
  /** Callback to run whenever the {@link GPUDeviceManager#device | device} is lost. */
  onDeviceLost?: (info?: GPUDeviceLostInfo) => void
  /** Callback to run whenever the {@link GPUDeviceManager#device | device} has been intentionally destroyed. */
  onDeviceDestroyed?: (info?: GPUDeviceLostInfo) => void
}

/** Optional parameters used to set up/init a {@link GPUAdapter} and {@link GPUDevice} */
export interface GPUDeviceManagerSetupParams {
  /** {@link GPUAdapter} to use if set */
  adapter?: GPUAdapter | null
  /** {@link GPUDevice} to use if set */
  device?: GPUDevice | null
}

/**
 * Responsible for the WebGPU {@link GPUAdapter | adapter} and {@link GPUDevice | device} creations, losing and restoration.
 *
 * It will create all the GPU objects that need a {@link GPUDevice | device} to do so, as well as a {@link PipelineManager}. It will also keep a track of all the {@link Renderer}, {@link AllowedBindGroups | bind groups}, {@link Sampler}, {@link DOMTexture} and {@link GPUBuffer | GPU buffers} created.
 *
 * The {@link GPUDeviceManager} is also responsible for creating the {@link GPUCommandBuffer}, rendering all the {@link Renderer} and then submitting the {@link GPUCommandBuffer} at each {@link GPUDeviceManager#render | render} calls.
 */
export class GPUDeviceManager {
  /** Number of times a {@link GPUDevice} has been created */
  index: number
  /** The label of the {@link GPUDeviceManager}, used to create the {@link GPUDevice} for debugging purpose */
  label: string

  /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console */
  production: boolean

  /** The navigator {@link GPU} object */
  gpu: GPU | undefined
  /** The WebGPU {@link GPUAdapter | adapter} used */
  adapter: GPUAdapter | void
  /** Additional options to use when requesting an {@link GPUAdapter | adapter} */
  adapterOptions: GPURequestAdapterOptions
  /** The WebGPU {@link GPUDevice | device} used */
  device: GPUDevice | undefined
  /** Flag indicating whether the {@link GPUDeviceManager} is ready, i.e. its {@link adapter} and {@link device} have been successfully created */
  ready: boolean

  /** The {@link PipelineManager} used to cache {@link GPURenderPipeline} and {@link GPUComputePipeline} and set them only when appropriate */
  pipelineManager: PipelineManager

  /** Array of {@link Renderer | renderers} using that {@link GPUDeviceManager} */
  renderers: Renderer[]
  /** A Map containing all our created {@link AllowedBindGroups} */
  bindGroups: Map<string, AllowedBindGroups>
  /** An array containing all our created {@link GPUBuffer} */
  buffers: Map<Buffer['uuid'], Buffer>
  /** A {@link Map} containing all our created {@link IndirectBuffer} */
  indirectBuffers: Map<IndirectBuffer['uuid'], IndirectBuffer>

  /** A Map containing all our created {@link GPUBindGroupLayout} indexed by cache keys */
  bindGroupLayouts: Map<string, GPUBindGroupLayout>
  /** A Map containing all our created {@link BufferBinding} indexed by cache keys */
  bufferBindings: Map<string, BufferBinding>

  /** An array containing all our created {@link Sampler} */
  samplers: Sampler[]
  /** An array containing all our created {@link DOMTexture} */
  domTextures: DOMTexture[]
  /** An array to keep track of the newly uploaded {@link DOMTexture} and set their {@link DOMTexture#sourceUploaded | sourceUploaded} property */
  texturesQueue: DOMTexture[]

  /** Request animation frame callback returned id if used */
  animationFrameID: null | number

  /** function assigned to the {@link onBeforeRender} callback */
  _onBeforeRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the {@link onAfterRender} callback */
  _onAfterRenderCallback: () => void = () => {
    /* allow empty callback */
  }

  /** Callback to run if there's any error while trying to set up the {@link GPUAdapter | adapter} or {@link GPUDevice | device} */
  onError: () => void
  /** Callback to run whenever the {@link device} is lost. */
  onDeviceLost: (info?: GPUDeviceLostInfo) => void
  /** Callback to run whenever the {@link device} has been intentionally destroyed. */
  onDeviceDestroyed: (info?: GPUDeviceLostInfo) => void

  #mipsGeneration: {
    sampler: GPUSampler | null
    module: GPUShaderModule | null
    pipelineByFormat: Record<GPUTextureFormat, GPURenderPipeline>
  }

  /**
   * GPUDeviceManager constructor
   * @param parameters - {@link GPUDeviceManagerParams | parameters} used to create this {@link GPUDeviceManager}
   */
  constructor({
    label,
    production = false,
    adapterOptions = {},
    autoRender = true,
    onError = () => {
      /* allow empty callbacks */
    },
    onDeviceLost = (info?: GPUDeviceLostInfo) => {
      /* allow empty callbacks */
    },
    onDeviceDestroyed = (info?: GPUDeviceLostInfo) => {
      /* allow empty callbacks */
    },
  }: GPUDeviceManagerParams = {}) {
    this.index = 0
    this.label = label ?? 'GPUDeviceManager instance'
    this.production = production
    this.ready = false

    this.adapterOptions = adapterOptions

    this.onError = onError
    this.onDeviceLost = onDeviceLost
    this.onDeviceDestroyed = onDeviceDestroyed

    this.gpu = navigator.gpu

    this.setPipelineManager()
    this.setDeviceObjects()

    this.#mipsGeneration = {
      sampler: null,
      module: null,
      pipelineByFormat: {},
    }

    if (autoRender) {
      this.animate()
    }
  }

  /**
   * Set our {@link adapter} and {@link device} if possible.
   * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
   */
  async setAdapterAndDevice({ adapter = null, device = null }: GPUDeviceManagerSetupParams = {}) {
    await this.setAdapter(adapter)
    await this.setDevice(device)
  }

  /**
   * Set up our {@link adapter} and {@link device} and all the already created {@link renderers} contexts
   * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
   */
  async init({ adapter = null, device = null }: GPUDeviceManagerSetupParams = {}) {
    await this.setAdapterAndDevice({ adapter, device })

    // set context
    if (this.device) {
      for (const renderer of this.renderers) {
        if (!renderer.context) {
          renderer.setContext()
        }
      }
    }
  }

  /**
   * Set our {@link GPUDeviceManager.adapter | adapter} if possible.
   * The adapter represents a specific GPU. Some devices have multiple GPUs.
   * @param adapter - {@link GPUAdapter} to use if set.
   */
  async setAdapter(adapter: GPUAdapter | null = null) {
    if (!this.gpu) {
      this.onError()
      throwError("GPUDeviceManager: WebGPU is not supported on your browser/OS. No 'gpu' object in 'navigator'.")
    }

    if (adapter) {
      this.adapter = adapter
    } else {
      try {
        this.adapter = await this.gpu?.requestAdapter(this.adapterOptions)

        if (!this.adapter) {
          this.onError()
          throwError("GPUDeviceManager: WebGPU is not supported on your browser/OS. 'requestAdapter' failed.")
        }
      } catch (e) {
        this.onError()
        throwError('GPUDeviceManager: ' + e.message)
      }
    }
  }

  /**
   * Set our {@link GPUDeviceManager.device | device}.
   * @param device - {@link GPUDevice} to use if set.
   */
  async setDevice(device: GPUDevice | null = null) {
    if (device) {
      this.device = device
      this.ready = true
      this.index++
    } else {
      try {
        const requiredFeatures = [] as GPUFeatureName[]

        if ((this.adapter as GPUAdapter).features.has('float32-filterable')) {
          requiredFeatures.push('float32-filterable')
        }

        this.device = await (this.adapter as GPUAdapter)?.requestDevice({
          label: this.label + ' ' + this.index,
          requiredFeatures,
        })

        if (this.device) {
          this.ready = true
          this.index++
        }
      } catch (error) {
        this.onError()
        throwError(`${this.label}: WebGPU is not supported on your browser/OS. 'requestDevice' failed: ${error}`)
      }
    }

    this.device?.lost.then((info) => {
      throwWarning(`${this.label}: WebGPU device was lost: ${info.message}`)

      this.loseDevice()

      // do not call onDeviceLost event if the device was intentionally destroyed
      // call onDeviceDestroyed instead
      if (info.reason !== 'destroyed') {
        this.onDeviceLost(info)
      } else {
        this.onDeviceDestroyed(info)
      }
    })
  }

  /**
   * Set our {@link pipelineManager | pipeline manager}
   */
  setPipelineManager() {
    this.pipelineManager = new PipelineManager()
  }

  /**
   * Called when the {@link device} is lost.
   * Reset all our renderers
   */
  loseDevice() {
    this.ready = false

    this.pipelineManager.resetCurrentPipeline()

    // first clean all samplers
    this.samplers.forEach((sampler) => (sampler.sampler = null))

    this.renderers.forEach((renderer) => renderer.loseContext())

    this.bindGroupLayouts.clear()

    // reset the buffers array, it would eventually be repopulated while restoring the device
    this.buffers.clear()
  }

  /**
   * Called when the {@link device} should be restored.
   * Restore all our renderers.
   * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
   */
  async restoreDevice({ adapter = null, device = null }: GPUDeviceManagerSetupParams = {}) {
    await this.setAdapterAndDevice({ adapter, device })

    if (this.device) {
      // now recreate all the samplers
      this.samplers.forEach((sampler) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { type, ...samplerOptions } = sampler.options
        sampler.sampler = this.device.createSampler({
          label: sampler.label,
          ...samplerOptions,
        })
      })

      // recreate indirect buffers
      this.indirectBuffers.forEach((indirectBuffer) => indirectBuffer.create())

      // then the renderers
      this.renderers.forEach((renderer) => renderer.restoreContext())
    }
  }

  /**
   * Set all objects arrays that we'll keep track of
   */
  setDeviceObjects() {
    // keep track of renderers, bind groups, buffers, samplers, textures
    this.renderers = []
    this.bindGroups = new Map()
    this.buffers = new Map()
    this.indirectBuffers = new Map()
    this.bindGroupLayouts = new Map()
    this.bufferBindings = new Map()
    this.samplers = []
    this.domTextures = []

    // keep track of all textures that are being uploaded
    this.texturesQueue = []
  }

  /**
   * Add a {@link Renderer} to our {@link renderers} array
   * @param renderer - {@link Renderer} to add
   */
  addRenderer(renderer: Renderer) {
    this.renderers.push(renderer)
  }

  /**
   * Remove a {@link Renderer} from our {@link renderers} array
   * @param renderer - {@link Renderer} to remove
   */
  removeRenderer(renderer: Renderer) {
    this.renderers = this.renderers.filter((r) => r.uuid !== renderer.uuid)
  }

  /**
   * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by this {@link GPUDeviceManager}
   * @readonly
   */
  get deviceRenderedObjects(): SceneObject[] {
    return this.renderers.map((renderer) => renderer.renderedObjects).flat()
  }

  /**
   * Add a {@link AllowedBindGroups | bind group} to our {@link bindGroups | bind groups array}
   * @param bindGroup - {@link AllowedBindGroups | bind group} to add
   */
  addBindGroup(bindGroup: AllowedBindGroups) {
    this.bindGroups.set(bindGroup.uuid, bindGroup)
  }

  /**
   * Remove a {@link AllowedBindGroups | bind group} from our {@link bindGroups | bind groups array}
   * @param bindGroup - {@link AllowedBindGroups | bind group} to remove
   */
  removeBindGroup(bindGroup: AllowedBindGroups) {
    this.bindGroups.delete(bindGroup.uuid)
  }

  /**
   * Add a {@link GPUBuffer} to our our {@link buffers} array
   * @param buffer - {@link Buffer} to add
   */
  addBuffer(buffer: Buffer) {
    this.buffers.set(buffer.uuid, buffer)
  }

  /**
   * Remove a {@link Buffer} from our {@link buffers} Map
   * @param buffer - {@link Buffer} to remove
   */
  removeBuffer(buffer: Buffer) {
    this.buffers.delete(buffer?.uuid)
  }

  /**
   * Add a {@link Sampler} to our {@link samplers} array
   * @param sampler - {@link Sampler} to add
   */
  addSampler(sampler: Sampler) {
    this.samplers.push(sampler)
  }

  /**
   * Remove a {@link Sampler} from our {@link samplers} array
   * @param sampler - {@link Sampler} to remove
   */
  removeSampler(sampler: Sampler) {
    this.samplers = this.samplers.filter((s) => s.uuid !== sampler.uuid)
  }

  /**
   * Add a {@link DOMTexture} to our {@link domTextures} array
   * @param texture - {@link DOMTexture} to add
   */
  addDOMTexture(texture: DOMTexture) {
    this.domTextures.push(texture)
  }

  /**
   * Upload a {@link DOMTexture#texture | texture} to the GPU
   * @param texture - {@link DOMTexture} class object with the {@link DOMTexture#texture | texture} to upload
   */
  uploadTexture(texture: DOMTexture) {
    if (texture.source) {
      try {
        this.device?.queue.copyExternalImageToTexture(
          {
            source: texture.source as GPUImageCopyExternalImageSource,
            flipY: texture.options.flipY,
          } as GPUImageCopyExternalImage,
          { texture: texture.texture as GPUTexture, premultipliedAlpha: texture.options.premultipliedAlpha },
          { width: texture.size.width, height: texture.size.height }
        )

        if ((texture.texture as GPUTexture).mipLevelCount > 1) {
          this.generateMips(texture)
        }

        // add to our textures queue array to track when it has been uploaded
        this.texturesQueue.push(texture)
      } catch ({ message }) {
        throwError(`GPUDeviceManager: could not upload texture: ${texture.options.name} because: ${message}`)
      }
    } else {
      this.device?.queue.writeTexture(
        { texture: texture.texture as GPUTexture },
        new Uint8Array(texture.options.placeholderColor),
        { bytesPerRow: texture.size.width * 4 },
        { width: texture.size.width, height: texture.size.height }
      )
    }
  }

  /**
   * Mips generation helper on the GPU using our {@link device}. Caches sampler, module and pipeline (by {@link GPUTexture} formats) for faster generation.
   * Ported from https://webgpufundamentals.org/webgpu/lessons/webgpu-importing-textures.html
   * @param texture - {@link Texture} or {@link DOMTexture} for which to generate the mips.
   * @param commandEncoder - optional {@link GPUCommandEncoder} to use if we're already in the middle of a command encoding process.
   */
  generateMips(texture: Texture | DOMTexture, commandEncoder: GPUCommandEncoder = null) {
    if (!this.device) return

    if (!this.#mipsGeneration.module) {
      this.#mipsGeneration.module = this.device.createShaderModule({
        label: 'textured quad shaders for mip level generation',
        code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              let pos = array(

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
          `,
      })

      this.#mipsGeneration.sampler = this.device.createSampler({
        minFilter: 'linear',
        magFilter: 'linear',
      })
    }

    if (!this.#mipsGeneration.pipelineByFormat[texture.texture.format]) {
      this.#mipsGeneration.pipelineByFormat[texture.texture.format] = this.device.createRenderPipeline({
        label: 'Mip level generator pipeline',
        layout: 'auto',
        vertex: {
          module: this.#mipsGeneration.module,
        },
        fragment: {
          module: this.#mipsGeneration.module,
          targets: [{ format: texture.texture.format }],
        },
      })
    }

    const pipeline = this.#mipsGeneration.pipelineByFormat[texture.texture.format]

    const encoder =
      commandEncoder ||
      this.device.createCommandEncoder({
        label: 'Mip gen encoder',
      })

    let width = texture.texture.width
    let height = texture.texture.height
    let baseMipLevel = 0
    while (width > 1 || height > 1) {
      width = Math.max(1, (width / 2) | 0)
      height = Math.max(1, (height / 2) | 0)

      for (let layer = 0; layer < texture.texture.depthOrArrayLayers; ++layer) {
        const bindGroup = this.device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: this.#mipsGeneration.sampler },
            {
              binding: 1,
              resource: texture.texture.createView({
                dimension: '2d',
                baseMipLevel,
                mipLevelCount: 1,
                baseArrayLayer: layer,
                arrayLayerCount: 1,
              }),
            },
          ],
        })

        const renderPassDescriptor = {
          label: 'Mip generation render pass',
          colorAttachments: [
            {
              view: texture.texture.createView({
                dimension: '2d',
                baseMipLevel: baseMipLevel + 1,
                mipLevelCount: 1,
                baseArrayLayer: layer,
                arrayLayerCount: 1,
              }),
              loadOp: 'clear',
              storeOp: 'store',
            },
          ],
        }

        const pass = encoder.beginRenderPass(renderPassDescriptor as GPURenderPassDescriptor)
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, bindGroup)
        pass.draw(6) // call our vertex shader 6 times
        pass.end()
      }
      ++baseMipLevel
    }

    if (!commandEncoder) {
      const commandBuffer = encoder.finish()
      this.device.queue.submit([commandBuffer])
    }
  }

  /**
   * Remove a {@link DOMTexture} from our {@link domTextures} array
   * @param texture - {@link DOMTexture} to remove
   */
  removeDOMTexture(texture: DOMTexture) {
    this.domTextures = this.domTextures.filter((t) => t.uuid !== texture.uuid)
  }

  /* RENDER */

  /**
   * Create a requestAnimationFrame loop and run it
   */
  animate() {
    this.render()
    this.animationFrameID = requestAnimationFrame(this.animate.bind(this))
  }

  /**
   * Called each frame before rendering
   * @param callback - callback to run at each render
   * @returns - our {@link GPUDeviceManager}
   */
  onBeforeRender(callback: () => void): GPUDeviceManager {
    if (callback) {
      this._onBeforeRenderCallback = callback
    }

    return this
  }

  /**
   * Called each frame after rendering
   * @param callback - callback to run at each render
   * @returns - our {@link GPUDeviceManager}
   */
  onAfterRender(callback: () => void): GPUDeviceManager {
    if (callback) {
      this._onAfterRenderCallback = callback
    }

    return this
  }

  /**
   * Render everything:
   * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onBeforeCommandEncoder | onBeforeCommandEncoder} callbacks
   * - create a {@link GPUCommandEncoder}
   * - render all our {@link renderers}
   * - submit our {@link GPUCommandBuffer}
   * - upload {@link DOMTexture#texture | DOMTexture textures} that do not have a parentMesh
   * - empty our {@link texturesQueue} array
   * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onAfterCommandEncoder | onAfterCommandEncoder} callbacks
   */
  render() {
    if (!this.ready) return

    this._onBeforeRenderCallback && this._onBeforeRenderCallback()

    for (const renderer of this.renderers) {
      if (renderer.shouldRender) renderer.onBeforeCommandEncoder()
    }

    const commandEncoder = this.device?.createCommandEncoder({ label: this.label + ' command encoder' })
    !this.production && commandEncoder.pushDebugGroup(this.label + ' command encoder: main render loop')

    this.renderers.forEach((renderer) => renderer.render(commandEncoder))

    !this.production && commandEncoder.popDebugGroup()
    const commandBuffer = commandEncoder.finish()
    this.device?.queue.submit([commandBuffer])

    // handle textures
    // first check if media textures without parentMesh need to be uploaded
    this.domTextures
      .filter((texture) => !texture.parentMesh && texture.sourceLoaded && !texture.sourceUploaded)
      .forEach((texture) => this.uploadTexture(texture))

    // no need to use device.queue.onSubmittedWorkDone
    // as [Kai Ninomiya](https://github.com/kainino0x) stated:
    // "Anything you submit() after the copyExternalImageToTexture() is guaranteed to see the result of that call."
    for (const texture of this.texturesQueue) {
      texture.sourceUploaded = true
    }

    // clear texture queue
    this.texturesQueue = []

    for (const renderer of this.renderers) {
      if (renderer.shouldRender) renderer.onAfterCommandEncoder()
    }

    this._onAfterRenderCallback && this._onAfterRenderCallback()
  }

  /**
   * Destroy the {@link GPUDeviceManager} and its {@link renderers}
   */
  destroy() {
    if (this.animationFrameID) {
      cancelAnimationFrame(this.animationFrameID)
    }

    this.animationFrameID = null

    this.device?.destroy()
    this.device = null

    this.renderers.forEach((renderer) => renderer.destroy())

    // now clear everything that could have been left behind
    this.bindGroups.forEach((bindGroup) => bindGroup.destroy())
    this.buffers.forEach((buffer) => buffer?.destroy())
    this.indirectBuffers.forEach((indirectBuffer) => indirectBuffer.destroy())

    this.domTextures.forEach((texture) => texture.destroy())

    this.setDeviceObjects()
  }
}
