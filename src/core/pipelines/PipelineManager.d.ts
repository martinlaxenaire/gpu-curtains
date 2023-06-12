import { PipelineEntry } from './PipelineEntry'
import { MeshShadersOptions } from '../meshes/Mesh'
import { MaterialBindGroups, MaterialGeometryAttributes } from '../Material'
import { GPUCurtainsRenderer } from '../../curtains/renderer/GPUCurtainsRenderer'

export class PipelineManager {
  renderer: GPUCurtainsRenderer
  currentPipelineID: number | null
  pipelineEntries: PipelineEntry[]

  constructor({ renderer }: { renderer: GPUCurtainsRenderer })

  isSamePipeline(shaders: MeshShadersOptions): PipelineEntry | null

  createRenderPipeline({
    label: string,
    geometryAttributes: MaterialGeometryAttributes,
    bindGroups: MaterialBindGroups,
    shaders: MeshShadersOptions,
  }): PipelineEntry

  setCurrentPipeline(pass: GPURenderPassEncoder, pipelineEntry: PipelineEntry)
}
