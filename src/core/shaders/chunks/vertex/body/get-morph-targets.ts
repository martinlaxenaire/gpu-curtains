import { BufferBinding } from '../../../../bindings/BufferBinding'
import { BufferElement } from '../../../../bindings/bufferElements/BufferElement'
import { VertexShaderInputBaseParams } from '../../../full/vertex/get-vertex-shader-code'

/**
 * Compute the morphed targets transformations using the provided {@link core/geometries/Geometry.Geometry | Geometry} and {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} array parameters if any.
 * @param parameters - {@link VertexShaderInputBaseParams} used to compute the morphed `worldPosition` and `normal` vectors if any morph target is defined in the {@link core/geometries/Geometry.Geometry | Geometry} attributes.
 * @returns - The part of the vertex shader where the moprhed target is applied.
 */
export const getMorphTargets = ({ bindings = [], geometry }: VertexShaderInputBaseParams): string => {
  let morphTargets = ''

  const morphTargetsBindings = bindings.filter((binding) => binding.name.includes('morphTarget')) as BufferBinding[]
  morphTargetsBindings.forEach((binding) => {
    const morphAttributes = Object.values(binding.inputs).filter((input) => input.name !== 'weight')

    morphAttributes.forEach((input) => {
      const bindingType = BufferElement.getType(input.type)
      const attribute = geometry.getAttributeByName(input.name)

      if (attribute) {
        const attributeType = attribute.type

        // we could have only one attribute that's morphed
        const attributeBindingVar =
          morphAttributes.length === 1
            ? `${binding.name}.${input.name}[attributes.vertexIndex]`
            : `${binding.name}.elements[attributes.vertexIndex].${input.name}`

        if (bindingType === attributeType) {
          morphTargets += `${input.name} += ${binding.name}.weight * ${attributeBindingVar};\n\t`
        } else {
          // TODO other cases?!
          if (bindingType === 'vec3f' && attributeType === 'vec4f') {
            morphTargets += `${input.name} += ${binding.name}.weight * vec4(${attributeBindingVar}, 0.0);\n\t`
          }
        }
      }
    })
  })

  return morphTargets
}
