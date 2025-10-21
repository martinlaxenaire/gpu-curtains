const getFragmentOutputStruct = ({
  struct = [
    {
      type: "vec4f",
      name: "color"
    }
  ]
}) => {
  const outputStructContent = struct.map((s, i) => {
    return (
      /* wgsl */
      `
  @location(${i}) ${s.name}: ${s.type},`
    );
  }).join("");
  return (
    /* wgsl */
    `struct FSOutput {${outputStructContent}
}`
  );
};

export { getFragmentOutputStruct };
