import { useEffect, useRef } from 'react';

export function BarcodeOverlay({ barcodes, width, height, boundingBox, cornerPoints }) {
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
  }, [ barcodes, width, height, bbFill, cpFill, bbStroke, cpStroke, bbRadii ]);
  return <canvas {...{ ref, width, height }} />;
}
