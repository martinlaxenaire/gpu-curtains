//#region src/extras/loaders/HDRLoader.ts
/**
* Basic HDR loader class. This loader is not intended to be used as is, but is used internally by the {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} class.
*
* Allow to load an HDR file from an URI and returns a {@link HDRImageData} object containing the {@link Float32Array} data alongside width, height and other useful information.
*
* @example
* ```javascript
* const hdrLoader = new HDRLoader()
* const hdr = await hdrLoader.loadFromUrl('path/to/environment.hdr')
*
* // assuming `renderer` is a valid Renderer
* const envTexture = new Texture(renderer, {
*   label: 'Environment texture',
*   name: 'envTexture',
*   visibility: ['fragment'],
*   format: 'rgba16float',
*   fixedSize: {
*     width: hdr.width,
*     height: hdr.height,
*   },
* })
*
* envTexture.uploadData({
*   data: hdr.data,
* })
* ```
*/
var HDRLoader = class {
	/**
	* Load and decode RGBE-encoded data to a flat list of floating point pixel data (RGBA).
	* @param url - The url of the .hdr file to load.
	* @returns - The {@link HDRImageData}.
	*/
	async loadFromUrl(url) {
		const buffer = await (await fetch(url)).arrayBuffer();
		return this.#decodeRGBE(new DataView(buffer));
	}
	/**
	* @ignore
	*/
	#decodeRGBE(data) {
		const stream = {
			data,
			offset: 0
		};
		const header = this.#parseHeader(stream);
		return {
			width: header.width,
			height: header.height,
			exposure: header.exposure,
			gamma: header.gamma,
			data: this.#parseData(stream, header)
		};
	}
	/**
	* @ignore
	*/
	#parseHeader(stream) {
		let line = this.#readLine(stream);
		const header = {
			colorCorr: [
				1,
				1,
				1
			],
			exposure: 1,
			gamma: 1,
			width: 0,
			height: 0,
			flipX: false,
			flipY: false
		};
		if (line !== "#?RADIANCE" && line !== "#?RGBE") throw new Error("Incorrect file format!");
		while (line !== "") {
			line = this.#readLine(stream);
			const parts = line.split("=");
			switch (parts[0]) {
				case "GAMMA":
					header.gamma = parseFloat(parts[1]);
					break;
				case "FORMAT":
					if (parts[1] !== "32-bit_rle_rgbe" && parts[1] !== "32-bit_rle_xyze") throw new Error("Incorrect encoding format!");
					break;
				case "EXPOSURE":
					header.exposure = parseFloat(parts[1]);
					break;
				case "COLORCORR":
					header.colorCorr = parts[1].replace(/^\s+|\s+$/g, "").split(" ").map((m) => parseFloat(m));
					break;
			}
		}
		line = this.#readLine(stream);
		const parts = line.split(" ");
		this.#parseSize(parts[0], parseInt(parts[1]), header);
		this.#parseSize(parts[2], parseInt(parts[3]), header);
		return header;
	}
	/**
	* @ignore
	*/
	#parseSize(label, value, header) {
		switch (label) {
			case "+X":
				header.width = value;
				break;
			case "-X":
				header.width = value;
				header.flipX = true;
				console.warn("Flipping horizontal orientation not currently supported");
				break;
			case "-Y":
				header.height = value;
				header.flipY = true;
				break;
			case "+Y":
				header.height = value;
				break;
		}
	}
	/**
	* @ignore
	*/
	#readLine(stream) {
		let ch, str = "";
		while ((ch = stream.data.getUint8(stream.offset++)) !== 10) str += String.fromCharCode(ch);
		return str;
	}
	/**
	* @ignore
	*/
	#parseData(stream, header) {
		const hash = stream.data.getUint16(stream.offset);
		let data;
		if (hash === 514) {
			data = this.#parseNewRLE(stream, header);
			if (header.flipX) this.#flipX(data, header);
			if (header.flipY) this.#flipY(data, header);
		} else throw new Error("Obsolete HDR file version!");
		return data;
	}
	/**
	* @ignore
	*/
	#parseNewRLE(stream, header) {
		const { width, height, colorCorr } = header;
		const tgt = new Float32Array(width * height * 4);
		let i = 0;
		let { offset, data } = stream;
		for (let y = 0; y < height; ++y) {
			if (data.getUint16(offset) !== 514) throw new Error("Incorrect scanline start hash");
			if (data.getUint16(offset + 2) !== width) throw new Error("Scanline doesn't match picture dimension!");
			offset += 4;
			const numComps = width * 4;
			const comps = [];
			let x = 0;
			while (x < numComps) {
				let value = data.getUint8(offset++);
				if (value > 128) {
					const len = value - 128;
					value = data.getUint8(offset++);
					for (let rle = 0; rle < len; ++rle) comps[x++] = value;
				} else for (let n = 0; n < value; ++n) comps[x++] = data.getUint8(offset++);
			}
			for (x = 0; x < width; ++x) {
				const r = comps[x];
				const g = comps[x + width];
				const b = comps[x + width * 2];
				let e = comps[x + width * 3];
				e = e ? Math.pow(2, e - 136) : 0;
				tgt[i++] = r * e * colorCorr[0];
				tgt[i++] = g * e * colorCorr[1];
				tgt[i++] = b * e * colorCorr[2];
				tgt[i++] = e;
			}
		}
		return tgt;
	}
	/**
	* @ignore
	*/
	#swap(data, i1, i2) {
		i1 *= 4;
		i2 *= 4;
		for (let i = 0; i < 4; ++i) {
			const tmp = data[i1 + i];
			data[i1 + i] = data[i2 + i];
			data[i2 + i] = tmp;
		}
	}
	/**
	* @ignore
	*/
	#flipX(data, header) {
		const { width, height } = header;
		const hw = width >> 1;
		for (let y = 0; y < height; ++y) {
			const b = y * width;
			for (let x = 0; x < hw; ++x) {
				const i1 = b + x;
				const i2 = b + width - 1 - x;
				this.#swap(data, i1, i2);
			}
		}
	}
	/**
	* @ignore
	*/
	#flipY(data, header) {
		const { width, height } = header;
		const hh = height >> 1;
		for (let y = 0; y < hh; ++y) {
			const b1 = y * width;
			const b2 = (height - 1 - y) * width;
			for (let x = 0; x < width; ++x) this.#swap(data, b1 + x, b2 + x);
		}
	}
};
//#endregion
export { HDRLoader };
