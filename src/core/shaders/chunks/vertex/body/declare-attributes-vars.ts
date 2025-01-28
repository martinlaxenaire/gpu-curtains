import { Geometry } from '../../../../geometries/Geometry'

export const declareAttributesVars = ({ geometry }: { geometry: Geometry }): string => {
  return geometry.vertexBuffers
    .map((vertexBuffer) =>
      vertexBuffer.attributes
        .map((attribute) => {
          return /* wgsl */ `
  var ${attribute.name}: ${attribute.type} = attributes.${attribute.name};`
        })
        .join('')
    )
    .join('\n')
}
