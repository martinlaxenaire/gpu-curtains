import { Geometry } from '../../../../geometries/Geometry'

/**
 * Declare all the provided {@link Geometry} attributes as variables.
 * @param parameters - Parameters used to declare the attributes variables.
 * @param parameters.geometry - {@link Geometry} used to declare the attributes variables.
 * @returns - A string with all the attributes variables declared.
 */
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
