var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _decodeRGBE, decodeRGBE_fn, _parseHeader, parseHeader_fn, _parseSize, parseSize_fn, _readLine, readLine_fn, _parseData, parseData_fn, _parseNewRLE, parseNewRLE_fn, _swap, swap_fn, _flipX, flipX_fn, _flipY, flipY_fn;
class HDRLoader {
  constructor() {
    /**
     * @ignore
     */
    __privateAdd(this, _decodeRGBE);
    /**
     * @ignore
     */
    __privateAdd(this, _parseHeader);
    /**
     * @ignore
     */
    __privateAdd(this, _parseSize);
    /**
     * @ignore
     */
    __privateAdd(this, _readLine);
    /**
     * @ignore
     */
    __privateAdd(this, _parseData);
    /**
     * @ignore
     */
    __privateAdd(this, _parseNewRLE);
    /**
     * @ignore
     */
    __privateAdd(this, _swap);
    /**
     * @ignore
     */
    __privateAdd(this, _flipX);
    /**
     * @ignore
     */
    __privateAdd(this, _flipY);
  }
  /**
   * Load and decode RGBE-encoded data to a flat list of floating point pixel data (RGBA).
   * @param url -  The url of the .hdr file to load
   * @returns - The {@link HDRImageData}
   */
  async loadFromUrl(url) {
    const buffer = await (await fetch(url)).arrayBuffer();
    return __privateMethod(this, _decodeRGBE, decodeRGBE_fn).call(this, new DataView(buffer));
  }
  /**
   * Convert an equirectangular {@link HDRImageData} to 6 {@link HDRImageData} cube map faces. Works but can display artifacts at the poles.
   * @param parsedHdr - equirectangular {@link HDRImageData} to use.
   * @returns - 6 {@link HDRImageData} cube map faces
   */
  equirectangularToCubeMap(parsedHdr) {
    const faceSize = Math.max(parsedHdr.width / 4, parsedHdr.height / 2);
    const faces = {
      posX: new Float32Array(faceSize * faceSize * 4),
      negX: new Float32Array(faceSize * faceSize * 4),
      posY: new Float32Array(faceSize * faceSize * 4),
      negY: new Float32Array(faceSize * faceSize * 4),
      posZ: new Float32Array(faceSize * faceSize * 4),
      negZ: new Float32Array(faceSize * faceSize * 4)
    };
    function getPixel(u, v) {
      const x = Math.floor(u * parsedHdr.width);
      const y = Math.floor(v * parsedHdr.height);
      const index = (y * parsedHdr.width + x) * 4;
      return [parsedHdr.data[index], parsedHdr.data[index + 1], parsedHdr.data[index + 2], parsedHdr.data[index + 3]];
    }
    function setPixel(face, x, y, pixel) {
      const index = (y * faceSize + x) * 4;
      faces[face][index] = pixel[0];
      faces[face][index + 1] = pixel[1];
      faces[face][index + 2] = pixel[2];
      faces[face][index + 3] = pixel[3];
    }
    function mapDirection(face, x, y) {
      const a = 2 * (x + 0.5) / faceSize - 1;
      const b = 2 * (y + 0.5) / faceSize - 1;
      switch (face) {
        case "posX":
          return [a, -1, -b];
        case "negX":
          return [-a, 1, -b];
        case "posY":
          return [-b, -a, 1];
        case "negY":
          return [b, -a, -1];
        case "posZ":
          return [-1, -a, -b];
        case "negZ":
          return [1, a, -b];
      }
    }
    function directionToUV(direction) {
      const [x, y, z] = direction;
      const r = Math.sqrt(x * x + y * y);
      const theta = Math.atan2(y, x);
      const phi = Math.atan2(z, r);
      const u = (theta + Math.PI) / (2 * Math.PI);
      const v = (phi + Math.PI / 2) / Math.PI;
      return [u, v];
    }
    for (const face in faces) {
      for (let y = 0; y < faceSize; y++) {
        for (let x = 0; x < faceSize; x++) {
          const direction = mapDirection(face, x, y);
          const [u, v] = directionToUV(direction);
          const pixel = getPixel(u, v);
          setPixel(face, x, y, pixel);
        }
      }
    }
    const facesData = [faces.posX, faces.negX, faces.posY, faces.negY, faces.posZ, faces.negZ];
    return facesData.map((faceData) => {
      return {
        data: faceData,
        width: faceSize,
        height: faceSize,
        exposure: parsedHdr.exposure,
        gamma: parsedHdr.gamma
      };
    });
  }
}
_decodeRGBE = new WeakSet();
decodeRGBE_fn = function(data) {
  const stream = {
    data,
    offset: 0
  };
  const header = __privateMethod(this, _parseHeader, parseHeader_fn).call(this, stream);
  return {
    width: header.width,
    height: header.height,
    exposure: header.exposure,
    gamma: header.gamma,
    data: __privateMethod(this, _parseData, parseData_fn).call(this, stream, header)
  };
};
_parseHeader = new WeakSet();
parseHeader_fn = function(stream) {
  let line = __privateMethod(this, _readLine, readLine_fn).call(this, stream);
  const header = {
    colorCorr: [1, 1, 1],
    exposure: 1,
    gamma: 1,
    width: 0,
    height: 0,
    flipX: false,
    flipY: false
  };
  if (line !== "#?RADIANCE" && line !== "#?RGBE")
    throw new Error("Incorrect file format!");
  while (line !== "") {
    line = __privateMethod(this, _readLine, readLine_fn).call(this, stream);
    const parts2 = line.split("=");
    switch (parts2[0]) {
      case "GAMMA":
        header.gamma = parseFloat(parts2[1]);
        break;
      case "FORMAT":
        if (parts2[1] !== "32-bit_rle_rgbe" && parts2[1] !== "32-bit_rle_xyze")
          throw new Error("Incorrect encoding format!");
        break;
      case "EXPOSURE":
        header.exposure = parseFloat(parts2[1]);
        break;
      case "COLORCORR":
        header.colorCorr = parts2[1].replace(/^\s+|\s+$/g, "").split(" ").map((m) => parseFloat(m));
        break;
    }
  }
  line = __privateMethod(this, _readLine, readLine_fn).call(this, stream);
  const parts = line.split(" ");
  __privateMethod(this, _parseSize, parseSize_fn).call(this, parts[0], parseInt(parts[1]), header);
  __privateMethod(this, _parseSize, parseSize_fn).call(this, parts[2], parseInt(parts[3]), header);
  return header;
};
_parseSize = new WeakSet();
parseSize_fn = function(label, value, header) {
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
};
_readLine = new WeakSet();
readLine_fn = function(stream) {
  let ch, str = "";
  while ((ch = stream.data.getUint8(stream.offset++)) !== 10)
    str += String.fromCharCode(ch);
  return str;
};
_parseData = new WeakSet();
parseData_fn = function(stream, header) {
  const hash = stream.data.getUint16(stream.offset);
  let data;
  if (hash === 514) {
    data = __privateMethod(this, _parseNewRLE, parseNewRLE_fn).call(this, stream, header);
    if (header.flipX)
      __privateMethod(this, _flipX, flipX_fn).call(this, data, header);
    if (header.flipY)
      __privateMethod(this, _flipY, flipY_fn).call(this, data, header);
  } else {
    throw new Error("Obsolete HDR file version!");
  }
  return data;
};
_parseNewRLE = new WeakSet();
parseNewRLE_fn = function(stream, header) {
  const { width, height, colorCorr } = header;
  const tgt = new Float32Array(width * height * 4);
  let i = 0;
  let { offset, data } = stream;
  for (let y = 0; y < height; ++y) {
    if (data.getUint16(offset) !== 514)
      throw new Error("Incorrect scanline start hash");
    if (data.getUint16(offset + 2) !== width)
      throw new Error("Scanline doesn't match picture dimension!");
    offset += 4;
    const numComps = width * 4;
    const comps = [];
    let x = 0;
    while (x < numComps) {
      let value = data.getUint8(offset++);
      if (value > 128) {
        const len = value - 128;
        value = data.getUint8(offset++);
        for (let rle = 0; rle < len; ++rle) {
          comps[x++] = value;
        }
      } else {
        for (let n = 0; n < value; ++n) {
          comps[x++] = data.getUint8(offset++);
        }
      }
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
};
_swap = new WeakSet();
swap_fn = function(data, i1, i2) {
  i1 *= 4;
  i2 *= 4;
  for (let i = 0; i < 4; ++i) {
    const tmp = data[i1 + i];
    data[i1 + i] = data[i2 + i];
    data[i2 + i] = tmp;
  }
};
_flipX = new WeakSet();
flipX_fn = function(data, header) {
  const { width, height } = header;
  const hw = width >> 1;
  for (let y = 0; y < height; ++y) {
    const b = y * width;
    for (let x = 0; x < hw; ++x) {
      const i1 = b + x;
      const i2 = b + width - 1 - x;
      __privateMethod(this, _swap, swap_fn).call(this, data, i1, i2);
    }
  }
};
_flipY = new WeakSet();
flipY_fn = function(data, header) {
  const { width, height } = header;
  const hh = height >> 1;
  for (let y = 0; y < hh; ++y) {
    const b1 = y * width;
    const b2 = (height - 1 - y) * width;
    for (let x = 0; x < width; ++x) {
      __privateMethod(this, _swap, swap_fn).call(this, data, b1 + x, b2 + x);
    }
  }
};

export { HDRLoader };
