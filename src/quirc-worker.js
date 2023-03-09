import Quirc from './wasm/quirc.js';

let wasm;

const methods = {
  async detect({ data, width, height }) {
    if (!wasm) {
      const res = await fetch(new URL('./wasm/quirc.wasm', import.meta.url));
      const wasmBinary = await res.arrayBuffer();
      wasm = await Quirc({ wasmBinary });
    }
    const { _prepare } = wasm;
    /* c8 ignore next 2 */
    if (!_prepare(width, height)) {
      throw new Error('Unable to allocate memory');
    }  
  
    // get pointer from WASM
    const { _begin, _end, _count, _get, _get_length, _get_type, _get_corners, HEAP8 } = wasm;
    const bufPtr = _begin();
    const heap = HEAP8.buffer;
    const buffer = new Uint8Array(heap, bufPtr, width * height);
    // convert image data to greyscale 
    greyscale(buffer, data);
    // scan it
    _end();
    let count = _count();
    if (count === 0) {
      // try with image inverted (quirc seems to modify the buffer so we need to redo the calculation)
      const bufPtrInv = _begin();
      const bufferInv = new Uint8Array(heap, bufPtrInv, width * height);
      greyscale(bufferInv, data);
      invert(bufferInv);
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
        const rawValue = (() => {
          const encodings = [ 'utf-8', 'iso-8859-1' ];
          if (type === 8) { // Kanji
            encodings.unshift('shift-jis');
          }
          for (const encoding of encodings) {
            try {
              return new TextDecoder(encoding, { fatal: true }).decode(bytes);
            } catch (err) {
            }
            /* c8 ignore next */
          }  
        })();
        // extract corners
        const cornerPtr = _get_corners();
        const coords = new Int32Array(heap, cornerPtr, 8);
        const cornerPoints = [];
        for (let j = 0; j < 4; j++) {
          const x = coords[j * 2];
          const y = coords[j * 2 + 1];
          cornerPoints.push({ x, y });
        }
        // bounding rect
        const xs = cornerPoints.map(p => p.x), ys = cornerPoints.map(p => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const boundingBox = new DOMRectReadOnly(minX, minY, maxX - minX, maxY - minY);
        barcodes.push({ rawValue, boundingBox, cornerPoints });
      }
    }
    return barcodes;
  }     
};

function greyscale(buffer, data) {
  for (let i = 0, j = 0; i < buffer.length; i++, j += 4) {
    const r = data[j + 0];
    const g = data[j + 1];
    const b = data[j + 2];
    const p = (r * 59 + g * 150 + b * 29) >> 8;
    buffer[i] = p;
  }
}

function invert(buffer) {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = 255 - buffer[i];
  }
}

addEventListener('message', async ({ data: { name, args } }) => {
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
});
