import { GPURenderer } from '../core/renderers/GPURenderer'
import { GPUCameraRenderer } from '../core/renderers/GPUCameraRenderer'
import { GPUCurtainsRenderer } from '../curtains/renderer/GPUCurtainsRenderer'

type Renderer = GPUCurtainsRenderer | GPUCameraRenderer | GPURenderer
type CameraRenderer = GPUCurtainsRenderer | GPUCameraRenderer

export function isRenderer(renderer: Renderer | undefined, type: string | null): boolean
export function isCameraRenderer(renderer: CameraRenderer | undefined, type: string | null): boolean
export function isCurtainsRenderer(renderer: GPUCurtainsRenderer | undefined, type: string | null): boolean

export function generateMips(device: GPUDevice, texture: GPUTexture): void