/// <reference types="dist" />
import { BindingsParams } from '../../../core/bindings/Bindings';
export type TextureBindingResource = GPUTexture | GPUExternalTexture | null;
export interface TextureBindingsParams extends BindingsParams {
    resource: TextureBindingResource;
}
