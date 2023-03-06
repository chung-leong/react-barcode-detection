import jsQR from 'jsqr';

const methods = {
  async initialize(width, height) {
  },
  async detect({ data, width, height }) {
    const code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
    const barcodes = [];
    if (code) {
      const { data, location } = code;
      const { bottomLeftCorner, bottomRightCorner, topLeftCorner, topRightCorner } = location;
      const cornerPoints = [ topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner ];
      const minX = Math.min(topLeftCorner.x, bottomLeftCorner.x);
      const maxX = Math.max(topRightCorner.x, bottomRightCorner.x);
      const minY = Math.min(topLeftCorner.y, topRightCorner.y);
      const maxY = Math.max(bottomLeftCorner.y, bottomRightCorner.y);
      const boundingBox = new DOMRectReadOnly(minX, minY, maxX - minX, maxY - minY);
      barcodes.push({ rawValue: data, boundingBox, cornerPoints });
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



