export const featureInstancesVs = /* wgsl */ `  
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) angle: f32,
  };
  
  fn rotationMatrix(axis: vec3f, angle: f32) -> mat4x4f {
    var nAxis: vec3f = normalize(axis);
    var s: f32 = sin(angle);
    var c: f32 = cos(angle);
    var oc: f32 = 1.0 - c;

    return mat4x4f(
      oc * nAxis.x * nAxis.x + c, oc * nAxis.x * nAxis.y - nAxis.z * s,  oc * nAxis.z * nAxis.x + nAxis.y * s,  0.0,
      oc * nAxis.x * nAxis.y + nAxis.z * s,  oc * nAxis.y * nAxis.y + c, oc * nAxis.y * nAxis.z - nAxis.x * s,  0.0,
      oc * nAxis.z * nAxis.x - nAxis.y * s,  oc * nAxis.y * nAxis.z + nAxis.x * s,  oc * nAxis.z * nAxis.z + c, 0.0,
      0.0, 0.0, 0.0, 1.0);
  }

  @vertex fn main(
    attributes: Attributes,
  ) -> VSOutput {    
    var vsOutput : VSOutput;
    
    // rotate instance first
    let instanceSpeed: f32 = attributes.instancePosition.w * 0.5 + 0.5;
    var angle: f32 = 3.141592 * frames.elapsed * 0.0025 * instanceSpeed + attributes.instancePosition.w;
    
    var transformed: vec3f = attributes.position;
    
    var rotatedTransformed: vec4f = vec4(transformed, 1.0) * rotationMatrix(vec3(0.0, 1.0, 0.0), angle);
    transformed = rotatedTransformed.xyz;
          
    // then instance translation
    transformed.x += attributes.instancePosition.x;
    transformed.y += attributes.instancePosition.y;
    transformed.z += attributes.instancePosition.z;
    
    vsOutput.position = getOutputPosition(transformed);
    
    // normals
    var rotatedNormal: vec4f = vec4(attributes.normal, 1.0) * rotationMatrix(vec3(0.0, 1.0, 0.0), angle);
    
    // vsOutput.normal = getOutputPosition(rotatedNormal.xyz).xyz;
    // vsOutput.normal = (vsOutput.position * rotatedNormal).xyz;
    // vsOutput.normal = rotatedNormal.xyz;
    
    vsOutput.normal = (matrices.model * rotatedNormal).xyz;
    
    vsOutput.angle = attributes.instancePosition.w / (3.141592 * 2.0);
    
    return vsOutput;
  }
`

export const featureInstancesFs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) angle: f32,
  };
  
  fn applyLightning(color: vec3f, normal: vec3f, lightPosition: vec3f) -> vec3f {
    var lightPos: vec3f = normalize(lightPosition);
    var light: f32 = smoothstep(0.45, 1.0, dot(normal, lightPos));
  
    var lightStrength: f32 = 0.35;
    var ambientLight: f32 = 1.0 - lightStrength;
    return color.rgb * light * lightStrength + color.rgb * ambientLight;
  }
  
  @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    var color: vec4f;
    var shading: vec3f = select(vec3(1.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), fsInput.angle > 0.5);
      
    var shadedColor: vec3f = applyLightning(shading, fsInput.normal, vec3(0.3, 0.3, 1.0));
    color = vec4(shadedColor, 1.0);
  
    return color;
  }
`
