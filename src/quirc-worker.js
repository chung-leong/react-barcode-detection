import Quirc from './wasm/quirc.js';

let wasm;
let prepared = false;

const methods = {
  async detect({ data, width, height }) {
    if (!wasm) {
      const res = await fetch(new URL('./wasm/quirc.wasm', import.meta.url));
      const wasmBinary = await res.arrayBuffer();
      wasm = await Quirc({ wasmBinary });
    }
    if (!prepared) {
      const { _prepare } = wasm;
      if (!_prepare(width, height)) {
        throw new Error('Unable to allocate memory');
      }  
      prepared = true;
    }

    // get pointer from WASM
    const { _begin, _end, _count, _get, _get_length, _get_type, _get_corners, HEAP8 } = wasm;
    const bufPtr = _begin();
    const heap = HEAP8.buffer;
    const pixelCount = width * height;
    const buffer = new Uint8Array(heap, bufPtr, pixelCount);
    // convert image data to greyscale 
    for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
      const r = data[j + 0];
      const g = data[j + 1];
      const b = data[j + 2];
      const sum = r * 59 + g * 150 + b * 29;
      buffer[i] = sum >> 8;
    }
    // scan it
    _end();
    let count = _count();
    if (count === 0) {
      // try inverting the image
      _begin();
      for (let i = 0; i < pixelCount; i++) {
        buffer[i] = 255 - buffer[i];
      }
      _end();
      count = _count();
    }
    const barcodes = [];
    for (let i = 0; i < count; i++) {
      const bytePtr = _get(i);
      if (bytePtr) {
        // convert bytes into a string
        const length = _get_length();
        const bytes = new Uint8Array(heap, bytePtr, length);
        const type = _get_type();
        let rawValue;
        try {
          if (type === 8) { // kanji
            rawValue = decode(bytes, 'shift-jis');
          } else {
            rawValue = decode(bytes, 'utf-8');
          }
        } catch (err) {
          rawValue = decode(bytes, 'iso-8859-1');
        }
        // extract corners
        const cornerPtr = _get_corners();
        const coords = new Int32Array(heap, cornerPtr, 8);
        const cornerPoints = [];
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let j = 0; j < 4; j++) {
          const x = coords[j * 2];
          const y = coords[j * 2 + 1];
          cornerPoints.push({ x, y });
          minX = Math.min(x, minX);
          minY = Math.min(y, minY);
          maxX = Math.max(x, maxX);
          maxY = Math.max(y, maxY);
        }
        const boundingBox = new DOMRectReadOnly(minX, minY, maxX - minX, maxY - minY);
        barcodes.push({ rawValue, boundingBox, cornerPoints });
      }
    }
    return barcodes;
  }   
};

function decode(bytes, encoding) {
  const decoder = new TextDecoder(encoding);
  return decoder.decode(bytes);
}

onmessage = async function({ data: { name, args} }) {
  try {
    const method = methods[name];
    if (!method) {
      throw new Error(`Unknown method: ${name}`);
    }
    const result = await method(...args);
    postMessage({ type: 'result', result });
  } catch (err) {
    postMessage({ type: 'error', message: err.message });
  }
}
