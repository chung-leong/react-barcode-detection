import Quirc from './wasm/quirc.js';

let wasm;

const methods = {
  async initialize(width, height) {
    const res = await fetch(new URL('./wasm/quirc.wasm', import.meta.url));
    const wasmBinary = await res.arrayBuffer();
    wasm = await Quirc({ wasmBinary });
    const { _prepare } = wasm;
    if (!_prepare(width, height)) {
      throw new Error('Unable to allocate memory');
    }
  },
  async detect({ data, width, height }) {
    // get pointer from WASM
    const { _begin, _end, _count, _get, _get_length, _get_type, _get_corners, HEAP8 } = wasm;
    const bufPtr = _begin();
    const heap = HEAP8.buffer;
    const buffer = new Uint8ClampedArray(heap, bufPtr, width * height);
    // convert image data to greyscale 
    for (let i = 0, j = 0; i < width * height; i++, j += 4) {
      const r = data[j + 0];
      const g = data[j + 1];
      const b = data[j + 2];
      const sum = r * 59 + g * 150 + b * 29;
      buffer[i] = sum >> 8;
    }
    // scan it
    _end();
    const count = _count();
    if (count > 0) {
      console.log({ count });
    }
    const barcodes = [];
    for (let i = 0; i < count; i++) {
      debugger;
      const rawPtr = _get(i);
      if (rawPtr) {
        const length = _get_length();
        const raw = new Uint8Array(heap, rawPtr, length);
        const type = _get_type();
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
        barcodes.push({ boundingBox, cornerPoints });
      }
    }
    return barcodes;
  }   
};

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



