export const computeFeatureInstances = /* wgsl */ `
  // https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39

  // On generating random numbers, with help of y= [(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of Statisticians 1998
  fn rand11(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }
  
  // set initial positions and data
  @compute @workgroup_size(64) fn main(
    @builtin(global_invocation_id) GlobalInvocationID: vec3<u32>
  ) {
    let index = GlobalInvocationID.x;
    
    if(index < arrayLength(&particles.position)) {
      let fIndex: f32 = f32(index);
      let nbParticles: f32 = f32(arrayLength(&particles.position));
      let PI: f32 = 3.14159265359;
      
      // now the positions
      // calculate an initial random position along a sphere the size of our system
      var position: vec3f;
      position.x = rand11(cos(fIndex * PI / nbParticles)) * 2.0 - 1.0;
      position.y = rand11(sin(fIndex * PI / nbParticles)) * 2.0 - 1.0;
      position.z = rand11(atan(fIndex * PI / nbParticles)) * 2.0 - 1.0;
      
      let normalizedPos = normalize(position);
      
      let angle: f32 = (rand11(acos(fIndex * PI / nbParticles)) * 2.0) * PI;
      let arcPosition = vec3(
        params.outerRadius * cos(angle),
        0.0,
        params.outerRadius * sin(angle)
      );  
      
      position = normalizedPos * vec3(params.innerRadius) + arcPosition;
      
      // write positions
      particles.position[index].x = position.x;
      particles.position[index].y = position.y;
      particles.position[index].z = position.z;
      
      // start angle
      particles.position[index].w = (rand11(tan(fIndex * PI / nbParticles)) * 2.0) * PI;
    }
  }
`