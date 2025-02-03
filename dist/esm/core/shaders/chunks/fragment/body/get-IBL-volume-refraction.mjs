const getIBLVolumeRefraction = ({
  transmissionBackgroundTexture = null,
  extensionsUsed = []
}) => {
  const hasDispersion = extensionsUsed.includes("KHR_materials_dispersion");
  const iblVolumeRefractionFunction = hasDispersion ? "getIBLVolumeRefractionWithDispersion" : "getIBLVolumeRefraction";
  return transmissionBackgroundTexture ? (
    /* wgsl */
    `
  var transmissionAlpha: f32 = 1.0;
  
  var transmitted: vec4f = ${iblVolumeRefractionFunction}(
    normal,
    normalize(viewDirection),
    roughness, 
    baseDiffuseColor,
    specularColor,
    specularF90,
    worldPosition,
    modelScale,
    camera.view,
    camera.projection,
    dispersion,
    ior,
    thickness,
    attenuationColor,
    attenuationDistance,
    ${transmissionBackgroundTexture.texture.options.name},
    ${transmissionBackgroundTexture.sampler.name},
  );
  
  transmissionAlpha = mix( transmissionAlpha, transmitted.a, transmission );
  
  totalDiffuse = mix(totalDiffuse, transmitted.rgb, transmission);
  outputColor.a *= transmissionAlpha;`
  ) : "";
};

export { getIBLVolumeRefraction };
