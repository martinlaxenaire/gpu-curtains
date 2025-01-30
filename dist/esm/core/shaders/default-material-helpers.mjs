const patchAdditionalChunks = (chunks = null) => {
  if (!chunks) {
    chunks = {
      additionalHead: "",
      preliminaryContribution: "",
      additionalContribution: ""
    };
  } else {
    if (!chunks.additionalHead) {
      chunks.additionalHead = "";
    }
    if (!chunks.preliminaryContribution) {
      chunks.preliminaryContribution = "";
    }
    if (!chunks.additionalContribution) {
      chunks.additionalContribution = "";
    }
  }
  return chunks;
};

export { patchAdditionalChunks };
