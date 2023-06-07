import { GPURenderer } from '../core/renderers/GPURenderer'
import { GPUCameraRenderer } from '../core/renderers/GPUCameraRenderer'
import { GPUCurtainsRenderer } from '../curtains/renderer/GPUCurtainsRenderer'

type CameraRenderer = GPURenderer | GPUCameraRenderer
type CurtainsRenderer = CameraRenderer | GPUCurtainsRenderer

type isRenderer = (renderer: GPURenderer, type: string | null) => boolean
type isCameraRenderer = (renderer: CameraRenderer, type: string | null) => boolean
type isCurtainsRenderer = (renderer: CurtainsRenderer, type: string | null) => boolean

type generateMips = (device: GPUDevice) => void
