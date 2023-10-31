/// <reference types="dist" />
import { BindingsParams } from '../../../core/bindings/Bindings';
export type SamplerBindingResource = GPUSampler | null;
export interface SamplerBindingsParams extends BindingsParams {
    resource: SamplerBindingResource;
}
