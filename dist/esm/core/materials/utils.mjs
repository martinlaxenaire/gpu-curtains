const compareRenderingOptions = (newOptions = {}, baseOptions = {}) => {
  const renderingOptions = [
    "useProjection",
    "transparent",
    "depth",
    "depthWriteEnabled",
    "depthCompare",
    "depthFormat",
    "cullMode",
    "sampleCount",
    "targets",
    "stencil",
    "verticesOrder",
    "topology"
  ];
  return renderingOptions.map((key) => {
    if (newOptions[key] && !baseOptions[key] || baseOptions[key] && !newOptions[key]) {
      return key;
    } else if (Array.isArray(newOptions[key]) || typeof newOptions[key] === "object") {
      return JSON.stringify(newOptions[key]) !== JSON.stringify(baseOptions[key]);
    } else {
      return newOptions[key] !== baseOptions[key];
    }
  });
};

export { compareRenderingOptions };
