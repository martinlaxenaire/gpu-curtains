import { Geometry } from '../../../../geometries/Geometry'

/**
 * Get the vertex shader WGSL output struct content from the given {@link Geometry}. Pass all {@link Geometry} attributes, plus eventual `bitangent` (`vec3f`) if `tangent` attribute is defined, and `viewDirection` (`vec3f`), `worldPosition` (`vec3f`) and `modelScale` (`vec3f`).
 * @param parameters - Parameters used to generate the vertex shader WGSL output struct content.
 * @param parameters.geometry - {@link Geometry} used to generate the struct content from its attributes.
 * @returns - String with the vertex shader WGSL output struct content.
 */
export const getVertexOutputStructContent = ({ geometry }: { geometry: Geometry }): string => {
  const tangentAttribute = geometry.getAttributeByName('tangent')

  const attributes = []
  if (geometry.vertexBuffers && geometry.vertexBuffers.length) {
    geometry.vertexBuffers.forEach((vertexBuffer) => {
      vertexBuffer.attributes.forEach((attribute) => {
        if (attribute.name !== 'position') {
          attributes.push(attribute)
        }
      })
    })
  }

  if (tangentAttribute) {
    attributes.push({
      name: 'bitangent',
      type: 'vec3f',
    })
  }

  const structAttributes = attributes
    .map((attribute, index) => {
      return `
  @location(${index}) ${attribute.name}: ${attribute.type},`
    })
    .join('')

  return `
  @builtin(position) position: vec4f,
  ${structAttributes}
  @location(${attributes.length}) viewDirection: vec3f,
  @location(${attributes.length + 1}) worldPosition: vec3f,
  @location(${attributes.length + 2}) modelScale: vec3f,`
}
