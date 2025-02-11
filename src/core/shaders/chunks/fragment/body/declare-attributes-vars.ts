import { Geometry } from '../../../../geometries/Geometry'
import { VertexShaderInputParams } from '../../../full/vertex/get-vertex-shader-code'

/**
 * Declare all the parameters coming from the fragment shader input struct. Used to declare mandatories `frontFacing` (`bool`), `normal` (`vec3f`), `worldPosition` (`vec3f`), `viewDirection` (`vec3f`) and `modelScale` (`vec3f`) passed by the vertex shader, as well as optionals `tangent` (`vec3f`), `bitangent` (`vec3f`) and UV coordinates (`vec2f`). Eventual vertex colors will be handled by the `get-base-color` chunk.
 * @param parameters - Parameters used to declare the attributes variables.
 * @param parameters.geometry - {@link Geometry} used to declare the attributes variables.
 * @param parameters.additionalVaryings - Optional additional {@link VertexShaderInputParams.additionalVaryings | varyings} passed from the vertex shader to the fragment shader to declare.
 * @returns - A string with all the attributes variables declared.
 */
export const declareAttributesVars = ({
  geometry,
  additionalVaryings = [],
}: {
  geometry?: Geometry
  additionalVaryings?: VertexShaderInputParams['additionalVaryings']
}): string => {
  let attributeVars = /* wgsl */ `
  let frontFacing: bool = fsInput.frontFacing;
  `

  const normalAttribute = geometry && geometry.getAttributeByName('normal')
  const tangentAttribute = geometry && geometry.getAttributeByName('tangent')

  // we don't need to declare those attributes
  // 'normal' and 'tangent' will be handled right after
  // 'color' will be handled by get-base-color chunk
  const disabledAttributes = ['position', 'normal', 'tangent', 'color', 'joints', 'weights']

  const attributes = []
  if (geometry && geometry.vertexBuffers && geometry.vertexBuffers.length) {
    geometry.vertexBuffers.forEach((vertexBuffer) => {
      vertexBuffer.attributes.forEach((attribute) => {
        if (!disabledAttributes.some((attr) => attribute.name.includes(attr))) {
          attributes.push(attribute)
        }
      })
    })
  }

  attributeVars += attributes
    .map((attribute) => {
      return `
  var ${attribute.name}: ${attribute.type} = fsInput.${attribute.name};`
    })
    .join('')

  // normal
  if (normalAttribute) {
    attributeVars += /* wgsl */ `
  var normal: vec3f = normalize(fsInput.normal);
    `
  } else {
    attributeVars += /* wgsl */ `
  // silly default normal
  var normal: vec3f = vec3(0.0, 0.0, 1.0);
    `
  }

  // normal
  if (tangentAttribute) {
    attributeVars += /* wgsl */ `
  var tangent: vec3f = normalize(fsInput.tangent.xyz);
  var bitangent: vec3f = normalize(fsInput.bitangent);
    `
  } else {
    attributeVars += /* wgsl */ `
  var tangent: vec3f;
  var bitangent: vec3f;
    `
  }

  attributeVars += /* wgsl */ `
  let worldPosition: vec3f = fsInput.worldPosition;
  let viewDirection: vec3f = fsInput.viewDirection;
  let modelScale: vec3f = fsInput.modelScale;
  `

  attributeVars += additionalVaryings
    .map((attribute) => {
      return `
  var ${attribute.name}: ${attribute.type} = fsInput.${attribute.name};`
    })
    .join('')

  return attributeVars
}
