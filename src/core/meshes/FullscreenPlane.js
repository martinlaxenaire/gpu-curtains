import MeshBaseMixin from './MeshBaseMixin'
import { isRenderer } from '../../utils/renderer-utils'
import { PlaneGeometry } from '../geometries/PlaneGeometry'
import { DOMElement } from '../DOMElement'
import default_vsWgsl from '../shaders/chunks/default_vs.wgsl'

export class FullscreenPlane extends MeshBaseMixin(class {}) {
  constructor(renderer, parameters = {}) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isRenderer(renderer, 'FullscreenQuadMesh')) {
      console.warn('FullscreenQuadMesh fail')
      return
    }

    // create a plane geometry first
    const geometry = new PlaneGeometry({ widthSegments: 1, heightSegments: 1 })

    if (!parameters.shaders.vertex || !parameters.shaders.vertex.code) {
      parameters.shaders.vertex = {
        code: default_vsWgsl,
        entryPoint: 'main',
      }
    }

    super(renderer, null, { geometry, ...parameters })

    this.size = {
      document: {
        width: 0,
        height: 0,
        top: 0,
        left: 0,
      },
    }

    this.domElement = new DOMElement({
      element: this.renderer.domElement.element,
      onSizeChanged: (boundingRect) => this.resize(boundingRect),
    })

    this.type = 'FullscreenQuadMesh'
  }

  resize(boundingRect) {
    if (!boundingRect && (!this.domElement || this.domElement?.isResizing)) return

    this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect()
    super.resize(boundingRect)
  }
}