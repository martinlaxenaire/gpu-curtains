export const clothVs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) normal: vec3f,
        @location(2) force: vec3f,
        @location(3) velocity: vec3f,
      };
      
      @vertex fn main(
        attributes: Attributes,
      ) -> VSOutput {
        var vsOutput: VSOutput;
                
        var transformed: vec3f = attributes.clothPosition.xyz;
        
        vsOutput.position = getOutputPosition(camera, matrices, transformed);
      
        vsOutput.uv = attributes.uv;
        vsOutput.normal = attributes.clothNormal.xyz;
        vsOutput.force = attributes.clothForce.xyz;
        vsOutput.velocity = attributes.clothVelocity.xyz;
      
        return vsOutput;
      }
    `

export const clothFs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) normal: vec3f,
        @location(2) force: vec3f,
        @location(3) velocity: vec3f,
      };
      
      fn applyLightning(color: vec3f, normal: vec3f, lightPosition: vec3f) -> vec3f {
        var lightPos: vec3f = normalize(lightPosition);
        var light: f32 = smoothstep(0.45, 1.0, dot(normal, lightPos));

        var lightStrength: f32 = 0.35;
        var ambientLight: f32 = 1.0 - lightStrength;
        return color.rgb * light * lightStrength + color.rgb * ambientLight;
      }
      
      fn saturate(color: vec3f, intensity: f32) -> vec3f {
        return clamp(color * intensity, vec3(0.0), vec3(1.0));
      }
      
      fn contrast(color: vec3f, intensity: f32) -> vec3f {
        return ((color - 0.5) * max(intensity, 0.0)) + 0.5;
      }
      
      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        var color: vec4f;
        var curtain: vec4f;
      
        var shading: vec3f = vec3(0.5);
        
        //var shadedColor: vec3f = applyLightning(shading, fsInput.normal, vec3(0.3, 0.3, 1.0));
        //curtain: vec4f = vec4(shadedColor, 1.0);
        
        // debug normals
        curtain = vec4(normalize(fsInput.normal) * 0.5 + 0.5, 1.0);
        
        // debug force
        //curtain = vec4(normalize(fsInput.force) * 0.5 + 0.5, 1.0);
        
        var title: vec4f = textureSample(canvasTexture, defaultSampler, fsInput.uv);
        
        //color = curtain + title;
        color = vec4(
          vec3( title.rgb + (curtain.rgb * (1.0 - title.a)) ),
          (title.a + (curtain.a * (1.0 - title.a)))
        ) * global.opacity;
        
        var shadedColor: vec3f = applyLightning(color.rgb, fsInput.normal, vec3(0.3, 0.3, 1.0));        
        var saturatedColor = saturate(color.rgb, 1.2);
        //color = vec4(saturatedColor, color.a);
        
        var contrastedColor = contrast(color.rgb, 1.5);
        //color = vec4(contrastedColor, color.a);
                      
        return color;
      }
    `