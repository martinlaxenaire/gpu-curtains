import { throwError, throwWarning } from '../../utils/utils'
import { generateMips, Renderer } from './utils'
import { Sampler } from '../samplers/Sampler'
import { PipelineManager } from '../pipelines/PipelineManager'
import { SceneObject } from './GPURenderer'
import { Texture } from '../textures/Texture'
import { AllowedBindGroups } from '../../types/BindGroups'

/**
 * Parameters used to create a {@link GPUDeviceManager}
 */
export interface GPUDeviceManagerParams {
  /** The label of the {@link GPUDeviceManager}, used to create the {@link GPUDevice} for debugging purpose */
  label?: string
  /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console */
  production?: boolean
  /** Callback to run if there's any error while trying to set up the [adapter]{@link GPUAdapter} or [device]{@link GPUDevice} */
  onError?: () => void
  /** Callback to run whenever the [device]{@link GPUDeviceManagerParams#device} is lost */
  onDeviceLost?: (info?: GPUDeviceLostInfo) => void
}

/**
 * GPUDeviceManager class:
 * Responsible for the WebGPU [adapter]{@link GPUAdapter} and [device]{@link GPUDevice} creations, losing and restoration.
 * Will also keep a track of all the [renderers]{@link Renderer}, [samplers]{@link Sampler} and [buffers]{@link GPUBuffer} created.
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
  /** The WebGPU [adapter]{@link GPUAdapter} used */
  adapter: GPUAdapter | void
  /** The WebGPU [adapter]{@link GPUAdapter} informations */
  adapterInfos: GPUAdapterInfo | undefined
  /** The WebGPU [device]{@link GPUDevice} used */
  device: GPUDevice | undefined
  /** Flag indicating whether the {@link GPUDeviceManager} is ready, i.e. its [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device} have been successfully created */
  ready: boolean

  /** The {@link PipelineManager} used to cache {@link GPURenderPipeline} and {@link GPUComputePipeline} and set them only when appropriate */
  pipelineManager: PipelineManager

  /** Array of [renderers]{@link Renderer} using that {@link GPUDeviceManager} */
  renderers: Renderer[]
  /** An array containing all our created {@link AllowedBindGroups} */
  bindGroups: AllowedBindGroups[]
  /** An array containing all our created {@link GPUBuffer} */
  buffers: GPUBuffer[]
  /** An array containing all our created {@link Sampler} */
  samplers: Sampler[]
  /** An array containing all our created {@link Texture} */
  textures: Texture[]
  /** An array to keep track of the newly uploaded [textures]{@link Texture} and set their [sourceUploaded]{@link Texture#sourceUploaded} property */
  texturesQueue: Texture[]

  /** Callback to run if there's any error while trying to set up the [adapter]{@link GPUAdapter}, [device]{@link GPUDevice} or [context]{@link GPUCanvasContext} */
  onError: () => void
  /** Callback to run whenever the [renderer device]{@link GPUDeviceManager#device} is lost */
  onDeviceLost: (info?: GPUDeviceLostInfo) => void

  /**
   * GPUDeviceManager constructor
   * @param parameters - [parameters]{@link GPUDeviceManagerParams} used to create this {@link GPUDeviceManager}
   */
  constructor({
    label,
    production = false,
    onError = () => {
      /* allow empty callbacks */
    },
    onDeviceLost = (info?: GPUDeviceLostInfo) => {
      /* allow empty callbacks */
    },
  }: GPUDeviceManagerParams) {
    this.index = 0
    this.label = label ?? 'GPUDeviceManager instance'
    this.production = production
    this.ready = false

    this.onError = onError
    this.onDeviceLost = onDeviceLost

    this.gpu = navigator.gpu

    if (!this.gpu) {
      setTimeout(() => {
        this.onError()
        throwError("GPURenderer: WebGPU is not supported on your browser/OS. No 'gpu' object in 'navigator'.")
      }, 0)
    }

    this.setPipelineManager()
    this.setDeviceObjects()
  }

  /**
   * Set our [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device} if possible
   */
  async setAdapterAndDevice() {
    await this.setAdapter()
    await this.setDevice()
  }

  /**
   * Set up our [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device} and all the already created [renderers]{@link GPUDeviceManager#renderers} contexts
   */
  async init() {
    await this.setAdapterAndDevice()

    // set context
    if (this.device) {
      this.renderers.forEach((renderer) => {
        if (!renderer.context) {
          renderer.setContext()
        }
      })
    }
  }

  /**
   * Set our [adapter]{@link GPUDeviceManager#adapter} if possible.
   * The adapter represents a specific GPU. Some devices have multiple GPUs.
   * @async
   */
  async setAdapter() {
    this.adapter = await this.gpu?.requestAdapter().catch(() => {
      setTimeout(() => {
        this.onError()
        throwError("GPUDeviceManager: WebGPU is not supported on your browser/OS. 'requestAdapter' failed.")
      }, 0)
    })
    ;(this.adapter as GPUAdapter)?.requestAdapterInfo().then((infos) => {
      this.adapterInfos = infos
    })
  }

  /**
   * Set our [device]{@link GPUDeviceManager#device}
   * @async
   */
  async setDevice() {
    try {
      this.device = await (this.adapter as GPUAdapter)?.requestDevice({
        label: this.label + ' ' + this.index,
      })

      this.ready = true

      this.index++
    } catch (error) {
      setTimeout(() => {
        this.onError()
        throwError(`${this.label}: WebGPU is not supported on your browser/OS. 'requestDevice' failed: ${error}`)
      }, 0)
    }

    this.device?.lost.then((info) => {
      throwWarning(`${this.label}: WebGPU device was lost: ${info.message}`)

      this.loseDevice()

      // do not call onDeviceLost event if the device was intentionally destroyed
      if (info.reason !== 'destroyed') {
        this.onDeviceLost(info)
      }
    })
  }

  /**
   * Set our [pipeline manager]{@link GPUDeviceManager#pipelineManager}
   */
  setPipelineManager() {
    this.pipelineManager = new PipelineManager()
  }

  /**
   * Called when the [device]{@link GPUDeviceManager#device} is lost.
   * Reset all our renderers
   */
  loseDevice() {
    this.ready = false

    // first clean all samplers
    this.samplers.forEach((sampler) => (sampler.sampler = null))

    this.renderers.forEach((renderer) => renderer.loseContext())

    // reset the buffers array, it would eventually be repopulated while restoring the device
    this.buffers = []
  }

  /**
   * Called when the [device]{@link GPUDeviceManager#device} should be restored.
   * Restore all our renderers
   */
  async restoreDevice() {
    await this.setAdapterAndDevice()

    if (this.device) {
      // now recreate all the samplers
      this.samplers.forEach((sampler) => {
        const { type, ...samplerOptions } = sampler.options
        sampler.sampler = this.device.createSampler({
          label: sampler.label,
          ...samplerOptions,
        })
      })

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
    this.bindGroups = []
    this.buffers = []
    this.samplers = []
    this.textures = []

    // keep track of all textures that are being uploaded
    this.texturesQueue = []
  }

  /**
   * Add a [renderer]{@link Renderer} to our [renderers array]{@link GPUDeviceManager#renderers}
   * @param renderer - [renderer]{@link Renderer} to add
   */
  addRenderer(renderer: Renderer) {
    this.renderers.push(renderer)
  }

  /**
   * Remove a [renderer]{@link Renderer} from our [renderers array]{@link GPUDeviceManager#renderers}
   * @param renderer - [renderer]{@link Renderer} to remove
   */
  removeRenderer(renderer: Renderer) {
    this.renderers = this.renderers.filter((r) => r.uuid !== renderer.uuid)
  }

  /**
   * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by this [device manager]{@link GPUDeviceManager}
   * @readonly
   */
  get deviceRenderedObjects(): SceneObject[] {
    return this.renderers.map((renderer) => renderer.renderedObjects).flat()
  }

  /**
   * Add a [bind group]{@link AllowedBindGroups} to our [bind groups array]{@link GPUDeviceManager#bindGroups}
   * @param bindGroup - [bind group]{@link AllowedBindGroups} to add
   */
  addBindGroup(bindGroup: AllowedBindGroups) {
    if (!this.bindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
      this.bindGroups.push(bindGroup)
    }
  }

  /**
   * Remove a [bind group]{@link AllowedBindGroups} from our [bind groups array]{@link GPUDeviceManager#bindGroups}
   * @param bindGroup - [bind group]{@link AllowedBindGroups} to remove
   */
  removeBindGroup(bindGroup: AllowedBindGroups) {
    this.bindGroups = this.bindGroups.filter((bG) => bG.uuid !== bindGroup.uuid)
  }

  /**
   * Add a [buffer]{@link GPUBuffer} to our our [buffers array]{@link GPUDeviceManager#buffers}
   * @param buffer - [buffer]{@link GPUBuffer} to add
   */
  addBuffer(buffer: GPUBuffer) {
    this.buffers.push(buffer)
  }

  /**
   * Remove a [buffer]{@link GPUBuffer} from our [buffers array]{@link GPUDeviceManager#buffers}
   * @param buffer - [buffer]{@link GPUBuffer} to remove
   * @param [originalLabel] - original [buffer]{@link GPUBuffer} label in case it has been swapped
   */
  removeBuffer(buffer: GPUBuffer, originalLabel?: string) {
    if (buffer) {
      this.buffers = this.buffers.filter((b) => {
        return !(b.label === (originalLabel ?? buffer.label) && b.size === buffer.size)
      })
    }
  }

  /**
   * Add a [sampler]{@link Sampler} to our [samplers array]{@link GPUDeviceManager#samplers}
   * @param sampler - [sampler]{@link Sampler} to add
   */
  addSampler(sampler: Sampler) {
    this.samplers.push(sampler)
  }

  /**
   * Remove a [sampler]{@link Sampler} from our [samplers array]{@link GPUDeviceManager#samplers}
   * @param sampler - [sampler]{@link Sampler} to remove
   */
  removeSampler(sampler: Sampler) {
    this.samplers = this.samplers.filter((s) => s.uuid !== sampler.uuid)
  }

  /**
   * Add a [texture]{@link Texture} to our [textures array]{@link GPUDeviceManager#textures}
   * @param texture - [texture]{@link Texture} to add
   */
  addTexture(texture: Texture) {
    this.textures.push(texture)
  }

  /**
   * Upload a [texture]{@link Texture} to the GPU
   * @param texture - [texture]{@link Texture} to upload
   */
  uploadTexture(texture: Texture) {
    if (texture.source) {
      try {
        this.device?.queue.copyExternalImageToTexture(
          {
            source: texture.source as GPUImageCopyExternalImageSource,
            flipY: texture.options.flipY,
          } as GPUImageCopyExternalImage,
          { texture: texture.texture as GPUTexture },
          { width: texture.size.width, height: texture.size.height }
        )

        if ((texture.texture as GPUTexture).mipLevelCount > 1) {
          generateMips(this.device, texture.texture as GPUTexture)
        }

        // add to our textures queue array to track when it has been uploaded
        this.texturesQueue.push(texture)
      } catch ({ message }) {
        throwError(`GPURenderer: could not upload texture: ${texture.options.name} because: ${message}`)
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
   * Remove a [texture]{@link Texture} from our [textures array]{@link GPUDeviceManager#textures}
   * @param texture - [texture]{@link Texture} to remove
   */
  removeTexture(texture: Texture) {
    this.textures = this.textures.filter((t) => t.uuid !== texture.uuid)
  }

  render() {
    if (!this.ready) return

    this.renderers.forEach((renderer) => renderer.onBeforeCommandEncoder())

    const commandEncoder = this.device?.createCommandEncoder({ label: this.label + ' command encoder' })

    this.renderers.forEach((renderer) => renderer.render(commandEncoder))

    const commandBuffer = commandEncoder.finish()
    this.device?.queue.submit([commandBuffer])

    // handle textures
    // first check if media textures without parent need to be uploaded
    this.textures
      .filter((texture) => !texture.parent && texture.sourceLoaded && !texture.sourceUploaded)
      .forEach((texture) => this.uploadTexture(texture))

    // no need to use device.queue.onSubmittedWorkDone
    // as [Kai Ninomiya](https://github.com/kainino0x) stated:
    // "Anything you submit() after the copyExternalImageToTexture() is guaranteed to see the result of that call."
    this.texturesQueue.forEach((texture) => {
      texture.sourceUploaded = true
    })

    // clear texture queue
    this.texturesQueue = []

    this.renderers.forEach((renderer) => renderer.onAfterCommandEncoder())
  }

  /**
   * Destroy the {@link GPUDeviceManager} and its [renderers]{@link GPUDeviceManager#renderers}
   */
  destroy() {
    this.device?.destroy()
    this.device = null

    this.renderers.forEach((renderer) => renderer.destroy())

    // now clear everything that could have been left behind
    this.bindGroups.forEach((bindGroup) => bindGroup.destroy())
    this.buffers.forEach((buffer) => buffer?.destroy())

    this.textures.forEach((texture) => texture.destroy())

    this.setDeviceObjects()
  }
}
