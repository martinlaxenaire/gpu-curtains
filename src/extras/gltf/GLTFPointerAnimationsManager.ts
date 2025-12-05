import { TypedArrayConstructor } from '../../core/bindings/utils'
import { Camera } from '../../core/cameras/Camera'
import { OrthographicCamera } from '../../core/cameras/OrthographicCamera'
import { PerspectiveCamera } from '../../core/cameras/PerspectiveCamera'
import { Light } from '../../core/lights/Light'
import { SpotLight } from '../../core/lights/SpotLight'
import { Object3D } from '../../core/objects3D/Object3D'
import { MediaTexture } from '../../core/textures/MediaTexture'
import { Vec2 } from '../../math/Vec2'
import { GLTF, MeshDescriptor } from '../../types'
import {
  KeyframesAnimation,
  KeyframesAnimationInputValue,
  KeyframesAnimationValueType,
} from '../animations/KeyframesAnimation'
import { TargetsAnimationsManager } from '../animations/TargetsAnimationsManager'
import { LitMesh, LitMeshMaterialUniformParams, ShaderTextureDescriptor } from '../meshes/LitMesh'
import { GLTFScenesManager } from './GLTFScenesManager'

export type PointerAnimationType = 'nodes' | 'materials' | 'textures' | 'cameras' | 'lights'

export type PointerAnimatedMaterialProperty =
  | keyof LitMeshMaterialUniformParams
  | 'iridescenceThicknessMinimum'
  | 'iridescenceThicknessMaximum'

export type PointerAnimatedTextureProperty = 'rotation' | 'scale' | 'offset'

export type PointerMaterialAnimations = Map<PointerAnimatedMaterialProperty, KeyframesAnimation>
export type PointerTextureAnimations = Map<
  { texture: MediaTexture; property: PointerAnimatedTextureProperty },
  KeyframesAnimation
>
export type MeshDescriptorPointerAnimations = Map<
  MeshDescriptor,
  {
    textures: PointerTextureAnimations
    materials: PointerMaterialAnimations
  }
>

export class GLTFPointerAnimationsManager {
  gltfScenesManager: GLTFScenesManager | null

  animations: {
    cameras: Map<Camera, KeyframesAnimation>
    lights: Map<Light, KeyframesAnimation>
    meshDescriptors: MeshDescriptorPointerAnimations
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

  addObjectToTargetAnimation(object: Object3D, targetsAnimation: TargetsAnimationsManager) {
    const hasTargetObject = targetsAnimation.targets.find((t) => t.object.object3DIndex === object.object3DIndex)
    if (!hasTargetObject) {
      targetsAnimation.addTarget(object)
    }
  }

  getAnimationTypeAndProperty(propertyPaths: string[]): {
    animatedProperty: string
    animationType: PointerAnimationType
  } {
    // TODO handle KHR_node_visibility/visible
    let animatedProperty = propertyPaths[propertyPaths.length - 1]

    let animationType = 'materials' as PointerAnimationType

    if (propertyPaths.includes('nodes')) {
      animationType = 'nodes'
    } else if (propertyPaths.includes('cameras')) {
      animationType = 'cameras'
    } else if (propertyPaths.includes('lights')) {
      animationType = 'lights'
    } else if (
      propertyPaths.includes('normalTexture') &&
      animatedProperty === 'scale' &&
      !propertyPaths.includes('KHR_texture_transform')
    ) {
      animationType = 'materials'
      animatedProperty = 'normalScale'
    } else if (
      propertyPaths.includes('clearcoatNormalTexture') &&
      animatedProperty === 'scale' &&
      !propertyPaths.includes('KHR_texture_transform')
    ) {
      animationType = 'materials'
      animatedProperty = 'clearcoatNormalScale'
    } else if (propertyPaths.includes('occlusionTexture') && animatedProperty === 'strength') {
      animationType = 'materials'
      animatedProperty = 'occlusionIntensity'
    } else if (
      propertyPaths.find((p) => p.indexOf('texture') !== -1) ||
      propertyPaths.find((p) => p.indexOf('Texture') !== -1)
    ) {
      animationType = 'textures'
    }

    return { animationType, animatedProperty }
  }

  getCleanCameraProperties(animatedProperty: string): {
    type: KeyframesAnimationValueType
    key: keyof OrthographicCamera | keyof PerspectiveCamera
  } {
    return (() => {
      switch (animatedProperty) {
        case 'znear':
          return {
            type: 'scalar',
            key: 'near',
          }
        case 'zfar':
          return {
            type: 'scalar',
            key: 'far',
          }
        case 'yfov':
          return {
            type: 'scalar',
            key: 'fov',
          }
        case 'aspectRatio':
          return {
            type: 'scalar',
            key: 'forceAspect',
          }
        case 'xmag':
          return {
            type: 'scalar',
            key: 'left',
          }
        case 'ymag':
          return {
            type: 'scalar',
            key: 'top',
          }
        default:
          return {
            type: null,
            key: null,
          }
      }
    })()
  }

  getCleanLightProperties(animatedProperty: string): {
    type: KeyframesAnimationValueType
    key: string
  } {
    return (() => {
      switch (animatedProperty) {
        case 'color':
          return {
            type: 'vec3',
            key: animatedProperty,
          }
        case 'intensity':
        case 'range':
        case 'innerConeAngle':
        case 'outerConeAngle':
          return {
            type: 'scalar',
            key: animatedProperty,
          }
        default:
          return {
            type: null,
            key: null,
          }
      }
    })()
  }

  getCleanMaterialProperties(animatedProperty: string): {
    type: KeyframesAnimationValueType
    key: PointerAnimatedMaterialProperty
  } {
    return (() => {
      switch (animatedProperty) {
        case 'alphaCutoff':
        case 'occlusionIntensity':
        case 'clearcoatRoughness':
        case 'dispersion':
        case 'ior':
        case 'attenuationDistance':
        case 'normalScale':
        case 'clearcoatNormalScale':
        case 'iridescenceThicknessMinimum':
        case 'iridescenceThicknessMaximum':
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
            type: 'vec3',
            key: 'emissiveColor',
          }
        case 'emissiveStrength':
          return {
            type: 'scalar',
            key: 'emissiveIntensity',
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
      key: PointerAnimatedMaterialProperty
    }
  }

  getMixedTextures(textureName: string, texturesDescriptors: ShaderTextureDescriptor[]): MediaTexture[] {
    const descriptor = texturesDescriptors.find((t) => t.texture.options.name === textureName)
    const textures = []

    if (descriptor) {
      textures.push(descriptor.texture)
    } else {
      if (textureName === 'specularTexture' || textureName === 'specularColorTexture') {
        const specDesc = texturesDescriptors.find((t) => t.texture.options.name === 'specularTexture')
        if (specDesc) {
          textures.push(specDesc)
        } else {
          if (textureName === 'specularTexture') {
            const specFactorDesc = texturesDescriptors.find((t) => t.texture.options.name === 'specularFactorTexture')
            if (specFactorDesc) textures.push(specFactorDesc.texture)
          }

          if (textureName === 'specularColorTexture') {
            const specColorDesc = texturesDescriptors.find((t) => t.texture.options.name === 'specularColorTexture')
            if (specColorDesc) textures.push(specColorDesc.texture)
          }
        }
      }

      if (textureName === 'transmissionTexture' || textureName === 'thicknessTexture') {
        const trthDesc = texturesDescriptors.find((t) => t.texture.options.name === 'transmissionThicknessTexture')
        if (trthDesc) {
          textures.push(trthDesc.texture)
        } else {
          if (textureName === 'transmissionTexture') {
            const trDesc = texturesDescriptors.find((t) => t.texture.options.name === 'transmissionTexture')
            if (trDesc) textures.push(trDesc.texture)
          }

          if (textureName === 'thicknessTexture') {
            const thDesc = texturesDescriptors.find((t) => t.texture.options.name === 'thicknessTexture')
            if (thDesc) textures.push(thDesc.texture)
          }
        }
      }

      if (textureName === 'sheenColorTexture' || textureName === 'sheenRoughnessTexture') {
        const sheenDesc = texturesDescriptors.find((t) => t.texture.options.name === 'sheenTexture')
        if (sheenDesc) {
          textures.push(sheenDesc.texture)
        } else {
          if (textureName === 'sheenColorTexture') {
            const sheenColorDesc = texturesDescriptors.find((t) => t.texture.options.name === 'sheenColorTexture')
            if (sheenColorDesc) textures.push(sheenColorDesc.texture)
          }

          if (textureName === 'sheenRoughnessTexture') {
            const sheenRoughDesc = texturesDescriptors.find((t) => t.texture.options.name === 'sheenRoughnessTexture')
            if (sheenRoughDesc) textures.push(sheenRoughDesc.texture)
          }
        }
      }

      if (textureName === 'clearcoatTexture' || textureName === 'clearcoatRoughnessTexture') {
        const ccDesc = texturesDescriptors.find((t) => t.texture.options.name === 'clearcoatTexture')
        if (ccDesc) {
          textures.push(ccDesc.texture)
        } else {
          if (textureName === 'clearcoatTexture') {
            const ccFactorDesc = texturesDescriptors.find((t) => t.texture.options.name === 'clearcoatFactorTexture')
            if (ccFactorDesc) textures.push(ccFactorDesc.texture)
          }
          if (textureName === 'clearcoatRoughnessTexture') {
            const ccRoughDesc = texturesDescriptors.find((t) => t.texture.options.name === 'clearcoatRoughnessTexture')
            if (ccRoughDesc) textures.push(ccRoughDesc.texture)
          }
        }
      }

      if (textureName === 'iridescenceTexture' || textureName === 'iridescenceThicknessTexture') {
        const irDesc = texturesDescriptors.find((t) => t.texture.options.name === 'iridescenceTexture')
        if (irDesc) {
          textures.push(irDesc.texture)
        } else {
          if (textureName === 'iridescenceTexture') {
            const irFactorDesc = texturesDescriptors.find((t) => t.texture.options.name === 'iridescenceFactorTexture')
            if (irFactorDesc) textures.push(irFactorDesc.texture)
          }

          if (textureName === 'iridescenceThicknessTexture') {
            const irThickDesc = texturesDescriptors.find(
              (t) => t.texture.options.name === 'iridescenceThicknessTexture'
            )
            if (irThickDesc) textures.push(irThickDesc.texture)
          }
        }
      }

      if (textureName === 'diffuseTransmissionTexture' || textureName === 'diffuseTransmissionColorTexture') {
        const difDesc = texturesDescriptors.find((t) => t.texture.options.name === 'diffuseTransmissionTexture')
        if (difDesc) {
          textures.push(difDesc.texture)
        } else {
          if (textureName === 'diffuseTransmissionTexture') {
            const difFactorDesc = texturesDescriptors.find(
              (t) => t.texture.options.name === 'diffuseTransmissionFactorTexture'
            )
            if (difFactorDesc) textures.push(difFactorDesc.texture)
          }

          if (textureName === 'diffuseTransmissionColorTexture') {
            const difColorDesc = texturesDescriptors.find(
              (t) => t.texture.options.name === 'diffuseTransmissionColorTexture'
            )
            if (difColorDesc) textures.push(difColorDesc.texture)
          }
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
        case 'specularColorTexture':
        case 'transmissionTexture':
        case 'thicknessTexture':
        case 'sheenColorTexture':
        case 'sheenRoughnessTexture':
        case 'clearcoatTexture':
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
            const propertyIndex = parseInt(splitedPropertyPaths[1])

            if (animationType === 'nodes') {
              // from https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/ObjectModel.adoc#4-core-pointers
              if (
                animatedProperty === 'rotation' ||
                animatedProperty === 'scale' ||
                animatedProperty === 'translation'
              ) {
                const node = this.gltfScenesManager.gltf.nodes[propertyIndex]
                const sceneNode = this.gltfScenesManager.scenesManager.nodes.get(propertyIndex)

                this.addObjectToTargetAnimation(sceneNode, targetsAnimation)

                const animName = node.name
                  ? `${node.name} pointer animation`
                  : `${channel.target.path} pointer animation ${propertyIndex}`
                const label = animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`

                const sampler = animation.samplers[channel.sampler]
                const { keyframes, values } = this.gltfScenesManager.getAnimationKeyframesValues(sampler)

                const inputValue = (() => {
                  switch (animatedProperty) {
                    case 'translation':
                      return sceneNode.position
                    case 'rotation':
                      return sceneNode.quaternion
                    case 'scale':
                      return sceneNode.scale
                    default:
                      return null
                  }
                })()

                const keyframesAnimation = new KeyframesAnimation({
                  label,
                  inputIndex: sampler.input,
                  keyframes,
                  values,
                  path: animatedProperty,
                  type: animatedProperty === 'rotation' ? 'quaternion' : 'vec3',
                  interpolation: sampler.interpolation,
                  inputValue,
                })

                targetsAnimation.addTargetAnimation(sceneNode, keyframesAnimation)
              }
            } else if (animationType === 'cameras') {
              // test model
              // https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/8dcd350aec1126d176cb50281951758644b3e657/Models/AnimateAllTheThings/glTF/AnimateAllTheThings.gltf
              const isOrthographic = splitedPropertyPaths.includes('orthographic')
              const gltfCamera = this.gltfScenesManager.gltf.cameras[propertyIndex]

              const sampler = animation.samplers[channel.sampler]
              const path = channel.target.path
              const { keyframes, values } = this.gltfScenesManager.getAnimationKeyframesValues(sampler)

              const cameraProperties = this.getCleanCameraProperties(animatedProperty)

              if (cameraProperties.key) {
                if (isOrthographic) {
                  const camera = this.gltfScenesManager.scenesManager.cameras[propertyIndex] as OrthographicCamera

                  this.addObjectToTargetAnimation(camera, targetsAnimation)

                  const animName = gltfCamera.name
                    ? `${gltfCamera.name} animation`
                    : `Orthographic camera ${propertyIndex} animation`
                  const label = animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`

                  const keyframesAnimation = new KeyframesAnimation({
                    label,
                    inputIndex: sampler.input,
                    keyframes,
                    values,
                    path,
                    type: cameraProperties.type,
                    interpolation: sampler.interpolation,
                    ...(cameraProperties.type === 'scalar' && {
                      inputValue: 0,
                    }),
                  })

                  if (keyframesAnimation.type === 'scalar') {
                    keyframesAnimation.onAfterUpdate = () => {
                      const value = keyframesAnimation.inputValue as number
                      if (cameraProperties.key === 'left') {
                        camera.left = -value
                        camera.right = value
                      } else if (cameraProperties.key === 'top') {
                        camera.top = value
                        camera.bottom = -value
                      } else {
                        camera[cameraProperties.key as 'near' | 'far'] = value
                      }
                    }
                  } else {
                    keyframesAnimation.inputValue = camera[cameraProperties.key]
                  }

                  targetsAnimation.addTargetAnimation(camera, keyframesAnimation)
                } else {
                  const camera = this.gltfScenesManager.scenesManager.cameras[propertyIndex] as PerspectiveCamera

                  this.addObjectToTargetAnimation(camera, targetsAnimation)

                  const animName = gltfCamera.name
                    ? `${gltfCamera.name} animation`
                    : `Perspective camera ${propertyIndex} animation`
                  const label = animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`

                  const keyframesAnimation = new KeyframesAnimation({
                    label,
                    inputIndex: sampler.input,
                    keyframes,
                    values,
                    path,
                    type: cameraProperties.type,
                    interpolation: sampler.interpolation,
                    ...(cameraProperties.type === 'scalar' && {
                      inputValue: 0,
                    }),
                  })

                  if (keyframesAnimation.type === 'scalar') {
                    keyframesAnimation.onAfterUpdate = () => {
                      const value = keyframesAnimation.inputValue as number
                      if (cameraProperties.key === 'fov') {
                        camera.fov = (value * 180) / Math.PI
                      } else if (cameraProperties.key === 'forceAspect') {
                        camera[cameraProperties.key] = value
                        this.gltfScenesManager.renderer.updateCameraViewport()
                      } else {
                        camera[cameraProperties.key as 'near' | 'far'] = value
                      }
                    }
                  } else {
                    keyframesAnimation.inputValue = camera[cameraProperties.key]
                  }

                  targetsAnimation.addTargetAnimation(camera, keyframesAnimation)
                }
              }
            } else if (animationType === 'lights') {
              // test models
              // https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/8dcd350aec1126d176cb50281951758644b3e657/Models/AnimatedWaterfall/glTF/AnimatedWaterfall.gltf
              // and
              // https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/8dcd350aec1126d176cb50281951758644b3e657/Models/AnimateAllTheThings/glTF/AnimateAllTheThings.gltf
              const light = this.gltfScenesManager.scenesManager.lights[propertyIndex]
              const gltfLight = this.gltfScenesManager.gltf.extensions['KHR_lights_punctual'].lights[propertyIndex]

              this.addObjectToTargetAnimation(light, targetsAnimation)
              const lightProperties = this.getCleanLightProperties(animatedProperty)

              const animName = `${light.options.label} ${lightProperties.key} animation`
              const label = animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`

              const sampler = animation.samplers[channel.sampler]
              const path = channel.target.path
              const { keyframes, values } = this.gltfScenesManager.getAnimationKeyframesValues(sampler)

              if (lightProperties.key) {
                const keyframesAnimation = new KeyframesAnimation({
                  label,
                  inputIndex: sampler.input,
                  keyframes,
                  values,
                  path,
                  type: lightProperties.type,
                  interpolation: sampler.interpolation,
                  ...(lightProperties.type === 'scalar' && {
                    inputValue: 0,
                  }),
                })

                const innerConeAngle =
                  gltfLight.type === 'spot'
                    ? gltfLight.spot.innerConeAngle !== undefined
                      ? gltfLight.spot.innerConeAngle
                      : 0
                    : 0
                const outerConeAngle =
                  gltfLight.type === 'spot'
                    ? gltfLight.spot.outerConeAngle !== undefined
                      ? gltfLight.spot.outerConeAngle
                      : Math.PI / 4.0
                    : Math.PI / 4.0

                const getPenumbra = (innerConeAngle: number, outerConeAngle: number): number => {
                  return 1.0 - innerConeAngle / outerConeAngle
                }

                light.userData.innerConeAngle = innerConeAngle
                light.userData.outerConeAngle = outerConeAngle

                if (keyframesAnimation.type === 'scalar') {
                  keyframesAnimation.onAfterUpdate = () => {
                    const value = keyframesAnimation.inputValue as number
                    if (lightProperties.key === 'innerConeAngle') {
                      light.userData.innerConeAngle = value
                      ;(light as SpotLight).penumbra = getPenumbra(
                        light.userData.innerConeAngle as number,
                        light.userData.outerConeAngle as number
                      )
                    } else if (lightProperties.key === 'outerConeAngle') {
                      light.userData.outerConeAngle = value
                      ;(light as SpotLight).penumbra = getPenumbra(
                        light.userData.innerConeAngle as number,
                        light.userData.outerConeAngle as number
                      )
                      ;(light as SpotLight).angle = value
                    } else {
                      ;(light[lightProperties.key] as number) = value
                    }
                  }
                } else {
                  keyframesAnimation.inputValue = light[lightProperties.key]
                }

                targetsAnimation.addTargetAnimation(light, keyframesAnimation)
              }
            } else if (animationType === 'materials' || animationType === 'textures') {
              // find corresponding primitive instance and therefore mesh descriptor
              const primitiveInstance = this.gltfScenesManager.getPrimitiveInstanceFromGLTFMaterial(propertyIndex)

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
                this.addObjectToTargetAnimation(targetObject, targetsAnimation)

                const sampler = animation.samplers[channel.sampler]
                const path = channel.target.path

                const { keyframes, values } = this.gltfScenesManager.getAnimationKeyframesValues(sampler)

                if (animationType === 'materials') {
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
                            property: animatedProperty as PointerAnimatedTextureProperty,
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
              const value = animation.inputValue as number
              if (mesh.uniforms.material[property]) {
                if (property === 'normalScale') {
                  ;(mesh.uniforms.material.normalScale.value as Vec2).set(value, value * normalYMultiplier)
                } else if (property === 'clearcoatNormalScale') {
                  ;(mesh.uniforms.material.clearcoatNormalScale.value as Vec2).set(value, value * normalYMultiplier)
                } else if (property === 'anisotropyVector') {
                  ;(mesh.uniforms.material.anisotropyVector.value as Vec2).set(Math.cos(value), Math.sin(value))
                } else {
                  ;(mesh.uniforms.material[property].value as number) = value
                }
              } else if (mesh.uniforms.material.iridescenceThicknessRange) {
                if (property === 'iridescenceThicknessMinimum') {
                  ;(mesh.uniforms.material.iridescenceThicknessRange.value as Vec2).x = value
                } else if (property === 'iridescenceThicknessMaximum') {
                  ;(mesh.uniforms.material.iridescenceThicknessRange.value as Vec2).y = value
                }
              }
            }
          } else if (mesh.uniforms.material[property]) {
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
