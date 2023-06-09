import { GPURenderer } from '../core/renderers/GPURenderer'
import { GPUCameraRenderer } from '../core/renderers/GPUCameraRenderer'
import { GPUCurtainsRenderer } from '../curtains/renderer/GPUCurtainsRenderer'

type CurtainsRenderer = GPUCurtainsRenderer
type CameraRenderer = CurtainsRenderer | GPUCameraRenderer

export function isRenderer(renderer: GPURenderer | undefined, type: string | null): boolean
export function isCameraRenderer(renderer: CameraRenderer | undefined, type: string | null): boolean
export function isCurtainsRenderer(renderer: CurtainsRenderer | undefined, type: string | null): boolean

export function generateMips(device: GPUDevice, texture: GPUTexture): void
