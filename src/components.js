import { createElement, useEffect, useRef } from 'react';
import { useBarcodeDetection } from './hooks.js';
import { StreamVideo, BlobImage } from 'react-media-capture';

const defCP = { 
  stroke: 'rgba(0, 255, 0, 0.8)',
  lineWidth: 3,
};  

export function BarcodeScanner(props) {
  const { 
    boundingBox, 
    cornerPoints = defCP, 
    children,
    delay = 0, 
    onData, 
    onBarcodes,
    onSnapshot, 
    ...options 
  } = props;
  if (delay > 0) {
    options.clearInterval = Infinity;
  }
  if (onSnapshot) {
    options.snapshot = true;
  }
  const { 
    status,
    liveVideo,
    capturedImage,
    barcodes,
    lastError,
  } = useBarcodeDetection(options);
  let content, overlay
  if (liveVideo) {
    const { stream, width, height } = liveVideo;
    const style = { 
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%', 
      objectFit: 'contain',
    };
    if (capturedImage) {
      const { blob } = capturedImage;
      content = createElement(BlobImage, { srcObject: blob, style });
    } else {
      content = createElement(StreamVideo, { srcObject: stream, style });
    }
    if (cornerPoints || boundingBox) {
      overlay = createElement(BarcodeOverlay, { barcodes, width, height, boundingBox, cornerPoints, style });
    }
  } else {
    content = children;
  }
  const classList = [ 'BarcodeScanner', status ];
  if (barcodes.length > 0) {
    classList.push('found');
  }
  const previous = useRef({ string: '[]', timer: 0 });
  useEffect(() => {
    const list = barcodes.map(({ format, rawValue }) => { return { format, rawValue } });
    const string = JSON.stringify(list);
    if (string !== previous.current.string) {
      previous.current.string = string;
      const notify = () => {
        onBarcodes?.(list);
        onData?.(list[0]?.rawValue);
        onSnapshot?.(capturedImage);
      };
      if (delay > 0) {
        // call handler only once
        if (!previous.current.timer) {
          previous.current.timer = setTimeout(notify, delay); 
        }
      } else {
        notify();
      }
    }
  }, [ barcodes, capturedImage, onData, onBarcodes, onSnapshot, delay ]);
  if (lastError) {
    return createElement('div', {}, lastError.message);
  }
  return createElement('div', { className: classList.join(' '), style: { position: 'relative' } }, content, overlay);
}

export function BarcodeOverlay({ barcodes, width, height, boundingBox, cornerPoints, style }) {
  const { 
    fill: bbFill, 
    stroke: bbStroke, 
    lineWidth: bbLineWidth = 2, 
    radii: bbRadii = 0,
    gap: bbGap = 0,
    margin: bbMargin = 0, 
  } = boundingBox ?? {};
  const { 
    fill: cpFill, 
    stroke: cpStroke,
    lineWidth: cpLineWidth = 2, 
  } = cornerPoints ?? {};
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    for (const { boundingBox, cornerPoints } of barcodes) {
      if (bbFill || bbStroke) {
        let { left, top, right, bottom, width, height } = boundingBox;
        if (bbMargin > 0) {
          const vMargin = height * bbMargin;
          const wMargin = width * bbMargin;
          left -= wMargin;
          right += wMargin;
          top -= vMargin;
          bottom += vMargin;
          width += wMargin * 2;
          height += vMargin * 2;
        }
        const vLen = height * (1 - bbGap) / 2;
        const wLen = width * (1 - bbGap) / 2;
        ctx.beginPath();
        ctx.moveTo(left, top + vLen);
        ctx.arcTo(left, top, left + wLen, top, bbRadii);
        ctx.lineTo(left + wLen, top);
        if (bbGap) {
          ctx.moveTo(right - wLen, top);
        }
        ctx.arcTo(right, top, right, top + vLen, bbRadii);
        ctx.lineTo(right, top + vLen);
        if (bbGap) {
          ctx.moveTo(right, bottom - vLen);
        }
        ctx.arcTo(right, bottom, right - wLen, bottom, bbRadii);
        ctx.lineTo(right - wLen, bottom);
        if (bbGap) {
          ctx.moveTo(left + wLen, bottom);
        }
        ctx.arcTo(left, bottom, left, bottom - vLen, bbRadii);
        ctx.lineTo(left, bottom - vLen);
        if (bbFill) {
          ctx.fillStyle = bbFill;
          ctx.fill();
        }
        if (bbStroke) {
          ctx.strokeStyle = bbStroke;
          ctx.lineWidth = bbLineWidth;
          ctx.stroke();
        }
      }
      if (cpFill || cpStroke) {
        ctx.beginPath();
        for (const [ index, { x, y } ] of cornerPoints.entries()) {
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        if (cpFill) {
          ctx.fillStyle = cpFill;
          ctx.fill();
        }
        if (cpStroke) {
          ctx.strokeStyle = cpStroke;
          ctx.lineWidth = cpLineWidth;
          ctx.stroke();
        }
      }
    }
  }, [ barcodes, width, height, 
    bbFill, bbStroke, bbLineWidth, bbRadii, bbGap, bbMargin,
    cpFill, cpStroke, cpLineWidth 
  ]);
  return createElement('canvas', { ref, width, height, style });
}
