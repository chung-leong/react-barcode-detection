import { createElement, useEffect, useRef } from 'react';
import { useBarcodeDetection } from './hooks.js';
import { StreamVideo } from 'react-media-capture';

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
    ...options 
  } = props;
  if (delay > 0) {
    options.clearInterval = Infinity;
  }
  const { 
    status,
    liveVideo,
    barcodes,
  } = useBarcodeDetection(options);
  let content, overlay
  if (liveVideo) {
    const { stream: srcObject, width, height } = liveVideo;
    const style = { 
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%', 
      objectFit: 'contain',
    };
    content = createElement(StreamVideo, { srcObject, style });
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
  }, [ barcodes, onData, onBarcodes, delay ]);
  return createElement('div', { className: classList.join(' '), style: { position: 'relative' } }, content, overlay);
}

export function BarcodeOverlay({ barcodes, width, height, boundingBox, cornerPoints, style }) {
  const { 
    fill: bbFill, 
    stroke: bbStroke, 
    lineWidth: bbLineWidth = 2, 
    radii: bbRadii = 0 
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
        const { left, top, width, height } = boundingBox;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(left, top, width, height, bbRadii);
        } else {
          ctx.rect(left, top, width, height);
        }
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
  }, [ barcodes, width, height, bbFill, bbStroke, bbLineWidth, bbRadii, cpFill, cpStroke, cpLineWidth ]);
  return createElement(canvas, { ref, width, height, style });
}
