import { PipelineEntry } from './PipelineEntry'
import { CurtainsRenderer } from '../../utils/renderer-utils'
import { MeshShadersOptions } from '../meshes/Mesh'
import { MaterialBindGroups, MaterialGeometryAttributes } from '../Material'

export class PipelineManager {
  renderer: CurtainsRenderer
  currentPipelineID: number | null
  pipelineEntries: PipelineEntry[]

  constructor({ renderer }: { renderer: CurtainsRenderer })

  isSamePipeline(shaders: MeshShadersOptions): PipelineEntry | null

  createRenderPipeline({
    label: string,
    geometryAttributes: MaterialGeometryAttributes,
    bindGroups: MaterialBindGroups,
    shaders: MeshShadersOptions,
  }): PipelineEntry

  setCurrentPipeline(pass: GPURenderPassEncoder, pipelineEntry: PipelineEntry)
}
