import { throwError, throwWarning } from '../../utils/utils'
import { Renderer } from './utils'
import { Sampler } from '../samplers/Sampler'
import { PipelineManager } from '../pipelines/PipelineManager'

export interface GPUDeviceManagerParams {
  label?: string
  /** Callback to run if there's any error while trying to set up the [adapter]{@link GPUAdapter} or [device]{@link GPUDevice} */
  onError?: () => void
  /** Callback to run whenever the [device]{@link GPUDeviceManagerParams#device} is lost */
  onDeviceLost?: (info?: GPUDeviceLostInfo) => void
}

/**
 * GPUDeviceManager class:
 * Responsible for the WebGPU [adapter]{@link GPUAdapter} and [device]{@link GPUDevice} creations.
 *
 */
export class GPUDeviceManager {
  /** Number of times a {@link GPUDevice} has been created */
  index: number
  /** The label of the {@link GPUDeviceManager}, used to create the {@link GPUDevice} for debugging purpose */
  label: string

  /** navigator {@link GPU} object */
  gpu: GPU | undefined
  /** The WebGPU [adapter]{@link GPUAdapter} used */
  adapter: GPUAdapter | void
  /** The WebGPU [adapter]{@link GPUAdapter} informations */
  adapterInfos: GPUAdapterInfo | undefined
  /** The WebGPU [device]{@link GPUDevice} used */
  device: GPUDevice | undefined
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

  async init() {
    await this.setAdapterAndDevice()

    // set context
    this.renderers.forEach((renderer) => {
      if (!renderer.context) {
        renderer.setContext()
      }
    })
  }

  /**
   * Set our [adapter]{@link GPUDeviceManager#adapter} if possible
   * @async
   * @returns - void promise result
   */
  async setAdapter(): Promise<void> {
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
   * @returns - void promise result
   */
  async setDevice(): Promise<void> {
    try {
      this.device = await (this.adapter as GPUAdapter)?.requestDevice({
        label: this.label + ' ' + this.index,
      })

      this.index++
    } catch (error) {
      setTimeout(() => {
        this.onError()
        throwError(`GPUDeviceManager: WebGPU is not supported on your browser/OS. 'requestDevice' failed: ${error}`)
      }, 0)
    }

    this.device?.lost.then((info) => {
      throwWarning(`GPUDeviceManager: WebGPU device was lost: ${info.message}`)

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
        sampler.sampler = this.device.createSampler({ label: sampler.label, ...sampler.options })
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
