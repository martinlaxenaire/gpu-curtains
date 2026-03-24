//#region src/core/shaders/default-material-helpers.ts
/**
* Patch {@link AdditionalChunks} in case they are missing.
* @param chunks - Chunks to patch.
*/
const patchAdditionalChunks = (chunks = null) => {
	if (!chunks) chunks = {
		additionalHead: "",
		preliminaryContribution: "",
		additionalContribution: ""
	};
	else {
		if (!chunks.additionalHead) chunks.additionalHead = "";
		if (!chunks.preliminaryContribution) chunks.preliminaryContribution = "";
		if (!chunks.additionalContribution) chunks.additionalContribution = "";
	}
	return chunks;
};
//#endregion
export { patchAdditionalChunks };
