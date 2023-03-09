import jsQR from 'jsqr';

const methods = {
  async detect({ data, width, height }) {
    const code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
    const barcodes = [];
    if (code) {
      const { data, chunks, binaryData, location } = code;
      const rawValue = (() => {
        if (data) {
          return data;
        }
        // can't decode the data--probably because it's not encoded as expected
        const bytes = new Uint8Array(binaryData);
        const encodings = [ 'utf-8', 'iso-8859-1' ];
        for (const encoding of encodings) {
          try {
            return new TextDecoder(encoding, { fatal: true }).decode(bytes);
          } catch (err) {
          }
          /* c8 ignore next */
        }  
      })();
      const { bottomLeftCorner, bottomRightCorner, topLeftCorner, topRightCorner } = location;
      const cornerPoints = [ topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner ];
      const minX = Math.min(topLeftCorner.x, bottomLeftCorner.x);
      const maxX = Math.max(topRightCorner.x, bottomRightCorner.x);
      const minY = Math.min(topLeftCorner.y, topRightCorner.y);
      const maxY = Math.max(bottomLeftCorner.y, bottomRightCorner.y);
      const boundingBox = new DOMRectReadOnly(minX, minY, maxX - minX, maxY - minY);
      barcodes.push({ rawValue, boundingBox, cornerPoints });
    }
    return barcodes;
  }
};

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
