import { throwError, throwWarning } from '../../utils/utils'
import { Renderer } from './utils'
import { Sampler } from '../samplers/Sampler'
import { PipelineManager } from '../pipelines/PipelineManager'
import { SceneObject } from './GPURenderer'

/**
 * Parameters used to create a {@link GPUDeviceManager}
 */
export interface GPUDeviceManagerParams {
  /** The label of the {@link GPUDeviceManager}, used to create the {@link GPUDevice} for debugging purpose */
  label?: string
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
// TODO if we'd want to fully optimize multiple canvases rendering, the render method and command encoder creation should be handled by the GPUDeviceManager and each renderer render methods should be called from here
export class GPUDeviceManager {
  /** Number of times a {@link GPUDevice} has been created */
  index: number
  /** The label of the {@link GPUDeviceManager}, used to create the {@link GPUDevice} for debugging purpose */
  label: string

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

  /** Array of [renderers]{@link Renderer} using that {@link GPUDeviceManager} */
  renderers: Renderer[]
  /** The {@link PipelineManager} used to cache {@link GPURenderPipeline} and {@link GPUComputePipeline} and set them only when appropriate */
  pipelineManager: PipelineManager

  /** An array containing all our created {@link GPUBuffer} */
  buffers: GPUBuffer[]
  /** An array containing all our created {@link Sampler} */
  samplers: Sampler[]

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
    onError = () => {
      /* allow empty callbacks */
    },
    onDeviceLost = (info?: GPUDeviceLostInfo) => {
      /* allow empty callbacks */
    },
  }: GPUDeviceManagerParams) {
    this.index = 0
    this.label = label ?? 'GPUDeviceManager instance'
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

    this.renderers = []
    this.buffers = []
    this.samplers = []
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
  get deviceObjects(): SceneObject[] {
    return this.renderers.map((renderer) => renderer.renderedObjects).flat()
  }

  /**
   * Remove a [buffer]{@link GPUBuffer} from our [buffers array]{@link GPUDeviceManager#buffers}
   * @param buffer - [buffer]{@link GPUBuffer} to remove
   */
  removeBuffer(buffer: GPUBuffer) {
    this.buffers = this.buffers.filter((b) => {
      return b.label !== buffer.label && b.usage !== buffer.usage && b.size !== buffer.size
    })
  }

  /**
   * Remove a [sampler]{@link Sampler} from our [samplers array]{@link GPUDeviceManager#samplers}
   * @param sampler - [sampler]{@link Sampler} to remove
   */
  removeSampler(sampler: Sampler) {
    this.samplers = this.samplers.filter((s) => s.uuid !== sampler.uuid)
  }

  render() {
    if (!this.ready) return

    this.renderers.forEach((renderer) => renderer.onBeforeCommandEncoder())

    const commandEncoder = this.device?.createCommandEncoder({ label: 'Renderer scene command encoder' })

    this.renderers.forEach((renderer) => renderer.render(commandEncoder))

    const commandBuffer = commandEncoder.finish()
    this.device?.queue.submit([commandBuffer])

    this.renderers.forEach((renderer) => renderer.onAfterCommandEncoder())
  }

  /**
   * Destroy the {@link GPUDeviceManager} and its [renderers]{@link GPUDeviceManager#renderers}
   */
  destroy() {
    this.device?.destroy()

    this.renderers.forEach((renderer) => renderer.destroy())
    this.buffers.forEach((buffer) => buffer?.destroy())
    this.renderers = []
    this.samplers = []
    this.buffers = []
  }
}
