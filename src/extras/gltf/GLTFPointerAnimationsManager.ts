import { TypedArrayConstructor } from '../../core/bindings/utils'
import { Camera } from '../../core/cameras/Camera'
import { Light } from '../../core/lights/Light'
import { MediaTexture } from '../../core/textures/MediaTexture'
import { Vec2 } from '../../math/Vec2'
import { MeshDescriptor } from '../../types'
import {
  KeyframesAnimation,
  KeyframesAnimationInputValue,
  KeyframesAnimationValueType,
} from '../animations/KeyframesAnimation'
import { LitMesh, LitMeshMaterialUniformParams, ShaderTextureDescriptor } from '../meshes/LitMesh'
import { GLTFScenesManager } from './GLTFScenesManager'

export type MaterialAnimations = Map<keyof LitMeshMaterialUniformParams, KeyframesAnimation>
export type TextureAnimations = Map<
  { texture: MediaTexture; property: 'rotation' | 'scale' | 'offset' },
  KeyframesAnimation
>
export type MeshDescriptorAnimations = Map<
  MeshDescriptor,
  {
    textures: TextureAnimations
    materials: MaterialAnimations
  }
>

export class GLTFPointerAnimationsManager {
  gltfScenesManager: GLTFScenesManager | null

  animations: {
    cameras: Map<Camera, KeyframesAnimation>
    lights: Map<Light, KeyframesAnimation>
    meshDescriptors: MeshDescriptorAnimations
  }

  constructor() {
    this.gltfScenesManager = null

    this.resetAnimationsMaps()
  }

  resetAnimationsMaps() {
    this.animations = {
      cameras: new Map(),
      lights: new Map(),
      meshDescriptors: new Map(),
    }
  }

  getAnimationTypeAndProperty(propertyPaths: string[]): {
    animatedProperty: string
    animationType: 'material' | 'camera' | 'light' | 'texture'
  } {
    let animatedProperty = propertyPaths[propertyPaths.length - 1]

    let animationType = 'material' as 'material' | 'camera' | 'light' | 'texture'
    if (propertyPaths.includes('cameras')) {
      animationType = 'camera'
    } else if (propertyPaths.includes('lights')) {
      animationType = 'light'
    } else if (
      propertyPaths.includes('normalTexture') &&
      animatedProperty === 'scale' &&
      !propertyPaths.includes('KHR_texture_transform')
    ) {
      animationType = 'material'
      animatedProperty = 'normalScale'
      console.log(propertyPaths)
    } else if (
      propertyPaths.includes('clearcoatNormalTexture') &&
      animatedProperty === 'scale' &&
      !propertyPaths.includes('KHR_texture_transform')
    ) {
      animationType = 'material'
      animatedProperty = 'clearcoatNormalScale'
    } else if (propertyPaths.includes('occlusionTexture') && animatedProperty === 'strength') {
      animationType = 'material'
      animatedProperty = 'occlusionItensity'
    } else if (
      propertyPaths.find((p) => p.indexOf('texture') !== -1) ||
      propertyPaths.find((p) => p.indexOf('Texture') !== -1)
    ) {
      animationType = 'texture'
    }

    return { animationType, animatedProperty }
  }

  getCleanMaterialProperties(animatedProperty: string): {
    type: KeyframesAnimationValueType
    key: keyof LitMeshMaterialUniformParams
  } {
    return (() => {
      switch (animatedProperty) {
        case 'alphaCutoff':
        case 'clearcoatRoughness':
        case 'dispersion':
        case 'ior':
        case 'attenuationDistance':
        case 'normalScale':
        case 'clearcoatNormalScale':
          return {
            type: 'scalar',
            key: animatedProperty,
          }
        case 'attenuationColor':
          return {
            type: 'vec3',
            key: animatedProperty,
          }
        case 'emissiveFactor':
          return {
            type: 'scalar',
            key: 'emissive',
          }
        case 'occlusionIntensity':
          return {
            type: 'scalar',
            key: 'occlusion',
          }
        case 'metallicFactor':
          return {
            type: 'scalar',
            key: 'metallic',
          }
        case 'roughnessFactor':
          return {
            type: 'scalar',
            key: 'roughness',
          }
        case 'anisotropyStrength':
          return {
            type: 'scalar',
            key: 'anisotropy',
          }
        case 'clearcoatFactor':
          return {
            type: 'scalar',
            key: 'clearcoat',
          }
        case 'emissiveStrength':
          return {
            type: 'scalar',
            key: 'emissive',
          }
        case 'iridescenceFactor':
          return {
            type: 'scalar',
            key: 'iridescence',
          }
        case 'iridescenceIor':
          return {
            type: 'scalar',
            key: 'iridescenceIOR',
          }
        case 'sheenColorFactor':
          return {
            type: 'vec3',
            key: 'sheenColor',
          }
        case 'sheenRoughnessFactor':
          return {
            type: 'scalar',
            key: 'sheenRoughness',
          }
        case 'specularFactor':
          return {
            type: 'scalar',
            key: 'specular',
          }
        case 'specularColorFactor':
          return {
            type: 'vec3',
            key: 'specularColor',
          }
        case 'transmissionFactor':
          return {
            type: 'scalar',
            key: 'transmission',
          }
        case 'thicknessFactor':
          return {
            type: 'scalar',
            key: 'thickness',
          }
        case 'anisotropyRotation': {
          return {
            type: 'scalar',
            key: 'anisotropyVector',
          }
        }
        default:
          return {
            type: null,
            key: null,
          }
      }
    })() as {
      type: KeyframesAnimationValueType
      key: keyof LitMeshMaterialUniformParams
    }
  }

  getMixedTextures(textureName: string, texturesDescriptors: ShaderTextureDescriptor[]): MediaTexture[] {
    const descriptor = texturesDescriptors.find((t) => t.texture.options.name === textureName)
    const textures = []
    if (descriptor) {
      textures.push(descriptor.texture)
    } else {
      if (
        textureName === 'specularTexture' ||
        textureName === 'specularFactorTexture' ||
        textureName === 'specularColorTexture'
      ) {
        const specDesc = texturesDescriptors.find((t) => t.texture.options.name === 'specularTexture')
        if (specDesc) {
          textures.push(specDesc)
        } else {
          const specFactorDesc = texturesDescriptors.find((t) => t.texture.options.name === 'specularFactorTexture')
          if (specFactorDesc) textures.push(specFactorDesc.texture)

          const specColorDesc = texturesDescriptors.find((t) => t.texture.options.name === 'specularColorTexture')
          if (specColorDesc) textures.push(specColorDesc.texture)
        }
      }

      if (textureName === 'transmissionTexture' || textureName === 'thicknessTexture') {
        const trthDesc = texturesDescriptors.find((t) => t.texture.options.name === 'transmissionThicknessTexture')
        if (trthDesc) {
          textures.push(trthDesc.texture)
        } else {
          const trDesc = texturesDescriptors.find((t) => t.texture.options.name === 'transmissionTexture')
          if (trDesc) textures.push(trDesc.texture)

          const thDesc = texturesDescriptors.find((t) => t.texture.options.name === 'thicknessTexture')
          if (thDesc) textures.push(thDesc.texture)
        }
      }

      if (textureName === 'sheenColorTexture' || textureName === 'sheenRoughnessTexture') {
        const sheenDesc = texturesDescriptors.find((t) => t.texture.options.name === 'sheenTexture')
        if (sheenDesc) {
          textures.push(sheenDesc.texture)
        } else {
          const sheenColorDesc = texturesDescriptors.find((t) => t.texture.options.name === 'sheenColorTexture')
          if (sheenColorDesc) textures.push(sheenColorDesc.texture)

          const sheenRoughDesc = texturesDescriptors.find((t) => t.texture.options.name === 'sheenRoughnessTexture')
          if (sheenRoughDesc) textures.push(sheenRoughDesc.texture)
        }
      }

      if (
        textureName === 'clearcoatTexture' ||
        textureName === 'clearcoatFactorTexture' ||
        textureName === 'clearcoatRoughnessTexture'
      ) {
        const ccDesc = texturesDescriptors.find((t) => t.texture.options.name === 'clearcoatTexture')
        if (ccDesc) {
          textures.push(ccDesc.texture)
        } else {
          const ccFactorDesc = texturesDescriptors.find((t) => t.texture.options.name === 'clearcoatFactorTexture')
          if (ccFactorDesc) textures.push(ccFactorDesc.texture)

          const ccRoughDesc = texturesDescriptors.find((t) => t.texture.options.name === 'clearcoatRoughnessTexture')
          if (ccRoughDesc) textures.push(ccRoughDesc.texture)
        }
      }

      if (textureName === 'iridescenceTexture' || textureName === 'iridescenceThicknessTexture') {
        const irDesc = texturesDescriptors.find((t) => t.texture.options.name === 'iridescenceTexture')
        if (irDesc) {
          textures.push(irDesc.texture)
        } else {
          const irFactorDesc = texturesDescriptors.find((t) => t.texture.options.name === 'iridescenceFactorTexture')
          if (irFactorDesc) textures.push(irFactorDesc.texture)

          const irThickDesc = texturesDescriptors.find((t) => t.texture.options.name === 'iridescenceThicknessTexture')
          if (irThickDesc) textures.push(irThickDesc.texture)
        }
      }

      if (textureName === 'diffuseTransmissionTexture' || textureName === 'diffuseTransmissionColorTexture') {
        const difDesc = texturesDescriptors.find((t) => t.texture.options.name === 'diffuseTransmissionTexture')
        if (difDesc) {
          textures.push(difDesc.texture)
        } else {
          const difFactorDesc = texturesDescriptors.find(
            (t) => t.texture.options.name === 'diffuseTransmissionFactorTexture'
          )
          if (difFactorDesc) textures.push(difFactorDesc.texture)
          const difColorDesc = texturesDescriptors.find(
            (t) => t.texture.options.name === 'diffuseTransmissionColorTexture'
          )
          if (difColorDesc) textures.push(difColorDesc.texture)
        }
      }
    }

    return textures
  }

  getCleanTextures(textureName: string, texturesDescriptors: ShaderTextureDescriptor[]): MediaTexture[] {
    return (() => {
      switch (textureName) {
        case 'baseColorTexture':
        case 'metallicRoughnessTexture':
        case 'normalTexture':
        case 'occlusionTexture':
        case 'emissiveTexture':
        case 'anisotropyTexture':
        case 'clearcoatNormalTexture':
          const descriptor = texturesDescriptors.find((t) => t.texture.options.name === textureName)
          return descriptor ? [descriptor.texture as MediaTexture] : []
        case 'specularTexture':
        case 'specularFactorTexture':
        case 'specularColorTexture':
        case 'transmissionTexture':
        case 'thicknessTexture':
        case 'sheenColorTexture':
        case 'sheenRoughnessTexture':
        case 'clearcoatTexture':
        case 'clearcoatFactorTexture':
        case 'clearcoatRoughnessTexture':
        case 'iridescenceTexture':
        case 'iridescenceThicknessTexture':
        case 'diffuseTransmissionTexture':
        case 'diffuseTransmissionColorTexture':
          return this.getMixedTextures(textureName, texturesDescriptors)
        default:
          return []
      }
    })()
  }

  //https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/ObjectModel.adoc#4-core-pointers
  createPointerAnimations(gltfScenesManager = null) {
    if (!gltfScenesManager) return

    if (this.gltfScenesManager) {
      this.gltfScenesManager.pointerAnimationsManager = null
    }

    this.gltfScenesManager = gltfScenesManager
    this.gltfScenesManager.pointerAnimationsManager = this

    this.resetAnimationsMaps()

    // animations pointers can concern
    // 1. cameras props (far, near, ortho x and y, perspective fov and aspect ratio)
    // 2. lights props (color, intensity, range, spot cone inner/outer radii)
    // 3. all textures transformations (scale, offset, rotation)
    // 4. any material  properties (beware of baseColorFactor and normalScale)
    if (this.gltfScenesManager.gltf.animations) {
      this.gltfScenesManager.scenesManager.animations.forEach((targetsAnimation, i) => {
        const animation = this.gltfScenesManager.gltf.animations[i]

        const channels = animation.channels.filter((channel) => channel.target.path === 'pointer')

        if (channels && channels.length) {
          channels.forEach((channel) => {
            let propertyPath: string = (channel.target.extensions.KHR_animation_pointer as unknown as any).pointer

            if (propertyPath.startsWith('/extensions/KHR_lights_punctual/')) {
              const suffix = propertyPath.substring('/extensions/KHR_lights_punctual/'.length)
              propertyPath = '/' + suffix
            }

            const splitedPropertyPaths = propertyPath.split('/')
            splitedPropertyPaths.shift()

            const { animatedProperty, animationType } = this.getAnimationTypeAndProperty(splitedPropertyPaths)

            if (animationType === 'material' || animationType === 'texture') {
              const gltfMaterialIndex = parseInt(splitedPropertyPaths[1])
              const gltfMaterial = this.gltfScenesManager.gltf.materials[gltfMaterialIndex]

              // find corresponding primitive instance and therefore mesh descriptor
              const primitiveInstance = this.gltfScenesManager.getPrimitiveInstanceFromGLTFMaterial(gltfMaterialIndex)

              if (primitiveInstance) {
                const { meshDescriptor } = primitiveInstance
                let animationMap = this.animations.meshDescriptors.get(meshDescriptor)
                if (!animationMap) {
                  animationMap = {
                    textures: new Map(),
                    materials: new Map(),
                  }

                  this.animations.meshDescriptors.set(meshDescriptor, animationMap)
                }

                const targetObject = meshDescriptor.nodes[0] // whatever
                const hasTargetObject = targetsAnimation.targets.find(
                  (t) => t.object.object3DIndex === targetObject.object3DIndex
                )
                if (!hasTargetObject) {
                  targetsAnimation.addTarget(targetObject)
                }

                const sampler = animation.samplers[channel.sampler]
                const path = channel.target.path

                const { keyframes, values } = this.gltfScenesManager.getAnimationKeyframesValues(sampler)

                if (animationType === 'material') {
                  console.log(gltfMaterial, primitiveInstance, animatedProperty)
                  //TODO iridescence thickness
                  if (animatedProperty === 'baseColorFactor') {
                    const colorValues = new (values.constructor as TypedArrayConstructor)(keyframes.length * 3)
                    const alphaValues = new (values.constructor as TypedArrayConstructor)(keyframes.length)
                    for (let i = 0, c = 0, a = 0; i < values.length; i += 4, c += 3, a++) {
                      colorValues[c] = values[i]
                      colorValues[c + 1] = values[i + 1]
                      colorValues[c + 2] = values[i + 2]

                      alphaValues[a] = values[i + 3]
                    }

                    const colorAnimName = `${meshDescriptor.parameters.label} color animation`
                    const colorLabel = animation.name
                      ? `${animation.name} ${colorAnimName}`
                      : `Animation ${i} ${colorAnimName}`

                    // inputValue will be set later
                    const colorKeyframesAnimation = new KeyframesAnimation({
                      label: colorLabel,
                      inputIndex: sampler.input,
                      keyframes,
                      values: colorValues,
                      path,
                      type: 'vec3',
                      interpolation: sampler.interpolation,
                    })

                    targetsAnimation.addTargetAnimation(targetObject, colorKeyframesAnimation)
                    animationMap.materials.set('color', colorKeyframesAnimation)

                    const alphaAnimName = `${meshDescriptor.parameters.label} opacity animation`
                    const alphaLabel = animation.name
                      ? `${animation.name} ${alphaAnimName}`
                      : `Animation ${i} ${alphaAnimName}`

                    const alphaKeyframesAnimation = new KeyframesAnimation({
                      label: alphaLabel,
                      inputIndex: sampler.input,
                      keyframes,
                      values: alphaValues,
                      path,
                      type: 'scalar',
                      interpolation: sampler.interpolation,
                      inputValue: 0,
                    })

                    targetsAnimation.addTargetAnimation(targetObject, alphaKeyframesAnimation)
                    animationMap.materials.set('opacity', alphaKeyframesAnimation)
                  } else {
                    const materialProperties = this.getCleanMaterialProperties(animatedProperty)

                    const animName = `${meshDescriptor.parameters.label} ${materialProperties.key} animation`
                    const label = animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`

                    if (materialProperties.key) {
                      // for non scalar values, inputValue will be set later
                      const keyframesAnimation = new KeyframesAnimation({
                        label,
                        inputIndex: sampler.input,
                        keyframes,
                        values,
                        path,
                        type: materialProperties.type,
                        interpolation: sampler.interpolation,
                        ...(materialProperties.type === 'scalar' && {
                          inputValue: 0,
                        }),
                      })

                      targetsAnimation.addTargetAnimation(meshDescriptor.nodes[0], keyframesAnimation)
                      animationMap.materials.set(materialProperties.key, keyframesAnimation)
                    }
                  }
                } else {
                  const textureName = splitedPropertyPaths.find((s) => s.indexOf('Texture') !== -1)

                  const animatedTextures = this.getCleanTextures(textureName, meshDescriptor.texturesDescriptors)

                  if (!animatedTextures.length) {
                    console.warn('TEXTURE NOT FOUND', propertyPath, textureName, meshDescriptor.texturesDescriptors)
                  }

                  if (textureName === 'clearcoatNormalTexture')
                    console.log(propertyPath, animatedTextures, animatedProperty)

                  // normal texture and clearcoat normal textures should be animated together
                  const normalTextureDesc = meshDescriptor.texturesDescriptors.find(
                    (desc) => desc.texture.options.name === 'normalTexture'
                  )
                  const clearcoatNormalTextureDesc = meshDescriptor.texturesDescriptors.find(
                    (desc) => desc.texture.options.name === 'clearcoatNormalTexture'
                  )
                  if (textureName === 'normalTexture' && clearcoatNormalTextureDesc) {
                    animatedTextures.push(clearcoatNormalTextureDesc.texture as MediaTexture)
                  } else if (textureName === 'clearcoatNormalTexture' && normalTextureDesc) {
                    animatedTextures.push(normalTextureDesc.texture as MediaTexture)
                  }

                  if (animatedTextures.length) {
                    animatedTextures.forEach((texture) => {
                      if (texture.options.useTransform) {
                        const animName = `${texture.options.label} ${animatedProperty} animation`
                        const label = animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`

                        // for non scalar values, inputValue will be set later
                        const keyframesAnimation = new KeyframesAnimation({
                          label,
                          inputIndex: sampler.input,
                          keyframes,
                          values,
                          path,
                          type: animatedProperty === 'rotation' ? 'scalar' : 'vec2',
                          interpolation: sampler.interpolation,
                          ...(animatedProperty === 'rotation' && {
                            inputValue: 0,
                          }),
                        })

                        targetsAnimation.addTargetAnimation(targetObject, keyframesAnimation)

                        animationMap.textures.set(
                          {
                            texture: texture,
                            property: animatedProperty as 'rotation' | 'scale' | 'offset',
                          },
                          keyframesAnimation
                        )
                      }
                    })
                  }
                }
              }
            }
          })
        }
      })
    }
    console.log(this.animations)
  }

  registerMeshAnimations(meshDescriptor: MeshDescriptor, mesh: LitMesh) {
    const meshDescriptorAnimationMap = this.animations.meshDescriptors.get(meshDescriptor)
    if (meshDescriptorAnimationMap) {
      const { textures, materials } = meshDescriptorAnimationMap
      if (materials && materials.size && mesh) {
        const geometry = meshDescriptor.parameters.geometry
        const hasTangent = geometry && !!geometry.getAttributeByName('tangent')
        const normalYMultiplier = hasTangent ? 1 : -1

        materials.forEach((animation, property) => {
          // for scalar values, the setter does not work
          // we need to manually update the value inside onAfterUpdate
          if (animation.type === 'scalar') {
            animation.onAfterUpdate = () => {
              if (property === 'normalScale') {
                const v = animation.inputValue as number
                ;(mesh.uniforms.material.normalScale.value as Vec2).set(v, v * normalYMultiplier)
              } else if (property === 'clearcoatNormalScale') {
                ;(mesh.uniforms.material.clearcoatNormalScale.value as Vec2).set(animation.inputValue as number)
              } else if (property === 'anisotropyVector') {
                const v = animation.inputValue as number
                ;(mesh.uniforms.material.anisotropyVector.value as Vec2).set(Math.cos(v), Math.sin(v))
              } else {
                ;(mesh.uniforms.material[property].value as number) = animation.inputValue as number
              }
            }
          } else {
            animation.inputValue = mesh.uniforms.material[property].value as KeyframesAnimationInputValue
          }
        })
      }

      if (textures && textures.size) {
        textures.forEach((animation, descriptor) => {
          const { texture, property } = descriptor
          // for scalar values, the setter does not work
          // we need to manually update the value inside onAfterUpdate
          if (animation.type === 'scalar') {
            animation.onAfterUpdate = () => {
              ;(texture[property] as number) = animation.inputValue as number
            }
          } else {
            animation.inputValue = texture[property]
          }
        })
      }
    }
  }
}
