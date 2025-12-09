import { Geometry } from '../../../../geometries/Geometry'

/**
 * Declare all the provided {@link Geometry} attributes as variables.
 * @param parameters - Parameters used to declare the attributes variables.
 * @param parameters.geometry - {@link Geometry} used to declare the attributes variables.
 * @returns - A string with all the attributes variables declared.
 */
export const declareAttributesVars = ({ geometry }: { geometry: Geometry }): string => {
  let attributeVars = geometry.vertexBuffers
    .map((vertexBuffer) =>
      vertexBuffer.attributes
        .map((attribute) => {
          let { name, type } = attribute
          let swizzle = ''

          // dequantize and force correct type
          if (name === 'position' || name === 'normal') {
            type = 'vec3f'
            swizzle = '.xyz'
          } else if (name === 'tangent') {
            type = 'vec4f'
          } else if (name.indexOf('uv') !== -1) {
            type = 'vec2f'
          }

          return /* wgsl */ `
  var ${name}: ${type} = ${type}(attributes.${name}${swizzle});`
        })
        .join('')
    )
    .join('\n')

  attributeVars += /* wgsl */ `
  var instanceIndex: u32 = attributes.instanceIndex;
  `

  return attributeVars
}
