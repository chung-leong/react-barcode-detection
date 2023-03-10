import { expect } from 'chai';
import { createElement } from 'react';
import { withTestRenderer } from './test-renderer.js';
import { withFakeDOM } from './fake-dom.js';
import { delay } from 'react-seq';

import { 
  BarcodeScanner,
} from '../index.js';
import {
  extractRadii
} from '../src/components.js';

describe('Components', function() {
  describe('#BarcodeScanner', function() {
    it('should behave correctly when there is no DOM', async function() {
      await withTestRenderer(async ({ render, toJSON }) => {
        const el = createElement(BarcodeScanner);
        await render(el);
        const { props } = toJSON();
        expect(props.className).to.equal('BarcodeScanner denied');
      });
    })
    it('should have acquiring as class name initially', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render, toJSON }) => {
          const el = createElement(BarcodeScanner);
          const nodes = {};
          const createNodeMock = ({ type, props }) => {
            const node = { ...props };
            nodes[type] = node;
            if (type === 'video') {
              node.play = () => {};
            }
            return node;
          };
          const promise = render(el, { createNodeMock });
          const { props } = toJSON();
          expect(props.className).to.equal('BarcodeScanner acquiring');  
          await promise;
          await delay(10);
          const { props:later } = toJSON();
          expect(later.className).to.equal('BarcodeScanner scanning');  
        });
      });
    })
    it('should call onData when a barcode is detected', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render, toJSON }) => {
          let data;
          const onData = d => data = d;
          const el = createElement(BarcodeScanner, { onData, scanInterval: 10 });
          const nodes = {};
          const createNodeMock = ({ type, props }) => {
            let node;
            if (type === 'video') {
              node = document.createElement('VIDEO');
              document.elements.VIDEO = [ node ];
            } else {
              node = { ...props };
            }
            nodes[type] = node;
            return node;
          };
          await render(el, { createNodeMock });
          await delay(10);
          const { props } = toJSON();
          expect(props.className).to.equal('BarcodeScanner scanning');  
          const { video } = nodes;
          expect(video).to.not.be.undefined;
          const barcode = {
            format: 'qr_code',
            rawValue: 'Hello world',
            boundingBox: { 
              left: 10,
              top: 10,
              right: 100,
              bottom: 100,
              width: 90,
              height: 90,
            },
            cornerPoints: [
              { x: 10, y: 10 },
              { x: 100, y: 10 },
              { x: 100, y: 100 },
              { x: 10, y: 100 }
            ],
          }
          video.barcodes = [ barcode ];
          await delay(30);
          expect(data).to.equal('Hello world');
        });
      });
    })
    it('should call onBarcodes when a barcode is detected', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render, toJSON }) => {
          let barcodes;
          const onBarcodes = b => barcodes = b;
          const el = createElement(BarcodeScanner, { onBarcodes, scanInterval: 10 });
          const nodes = {};
          const createNodeMock = ({ type, props }) => {
            let node;
            if (type === 'video') {
              node = document.createElement('VIDEO');
              document.elements.VIDEO = [ node ];
            } else {
              node = { ...props };
            }
            nodes[type] = node;
            return node;
          };
          await render(el, { createNodeMock });
          await delay(10);
          const { props } = toJSON();
          expect(props.className).to.equal('BarcodeScanner scanning');  
          const { video } = nodes;
          expect(video).to.not.be.undefined;
          const barcode = {
            format: 'qr_code',
            rawValue: 'Hello world',
            boundingBox: { 
              left: 10,
              top: 10,
              right: 100,
              bottom: 100,
              width: 90,
              height: 90,
            },
            cornerPoints: [
              { x: 10, y: 10 },
              { x: 100, y: 10 },
              { x: 100, y: 100 },
              { x: 10, y: 100 }
            ],
          }
          video.barcodes = [ barcode ];
          await delay(50);
          expect(barcodes).to.eql([ { format: 'qr_code', rawValue: 'Hello world' } ]);
        });
      });
    })
    it('should invoke onSnapshot when it is given', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render, toJSON }) => {
          let data;
          const onData = d => data = d;
          let snapshot;
          const onSnapshot = s => snapshot = s;
          const el = createElement(BarcodeScanner, { 
            onData,
            onSnapshot, 
            scanInterval: 10
          });
          const nodes = {};
          const createNodeMock = ({ type, props }) => {
            let node;
            if (type === 'video') {
              node = document.createElement('VIDEO');
              document.elements.VIDEO = [ node ];
            } else if (type === 'img') {
              // don't create the img node so no attempt is made 
              // to call URL.createObjectURL() on our fake blob
              node = null;
            } else {
              node = { ...props };
            }
            nodes[type] = node;
            return node;
          };
          await render(el, { createNodeMock });
          await delay(10);
          const { props } = toJSON();
          expect(props.className).to.equal('BarcodeScanner scanning');  
          const { video } = nodes;
          expect(video).to.not.be.undefined;
          const barcode = {
            format: 'qr_code',
            rawValue: 'Hello world',
            boundingBox: { 
              left: 10,
              top: 10,
              right: 100,
              bottom: 100,
              width: 90,
              height: 90,
            },
            cornerPoints: [
              { x: 10, y: 10 },
              { x: 100, y: 10 },
              { x: 100, y: 100 },
              { x: 10, y: 100 }
            ],
          }
          video.barcodes = [ barcode ];
          await delay(30);
          expect(data).to.equal('Hello world');
          expect(snapshot).to.be.an('object');
        });
      });
    })
    it('should draw bounding box overlay over video when a barcode is detected', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render, toJSON }) => {
          let data;
          const onData = d => data = d;
          const el = createElement(BarcodeScanner, { 
            onData, 
            boundingBox: {
              fill: 'rgba(0, 255, 0, 0.4)',
              stroke: '#fff',
              radii: 10,
              lineWidth: 4,
              gap: 0.5,
              margin: 0.1,           
            },
            scanInterval: 10,
          });
          const nodes = {};
          const createNodeMock = ({ type, props }) => {
            let node;
            if (type === 'video') {
              node = document.createElement('VIDEO');
              document.elements.VIDEO = [ node ];
            } else if (type === 'canvas') {
              node = document.createElement('CANVAS');
            } else {
              node = { ...props };
            }
            nodes[type] = node;
            return node;
          };
          await render(el, { createNodeMock });
          await delay(10);
          const { props } = toJSON();
          expect(props.className).to.equal('BarcodeScanner scanning');  
          const { video } = nodes;
          expect(video).to.not.be.undefined;
          const barcode = {
            format: 'qr_code',
            rawValue: 'Hello world',
            boundingBox: { 
              left: 10,
              top: 10,
              right: 100,
              bottom: 100,
              width: 90,
              height: 90,
            },
            cornerPoints: [
              { x: 10, y: 10 },
              { x: 100, y: 10 },
              { x: 100, y: 100 },
              { x: 10, y: 100 }
            ],
          }
          video.barcodes = [ barcode ];
          await delay(30);
          expect(data).to.equal('Hello world');
          const canvas = document.created.find(el => el.tagName === 'CANVAS');
          const { ops } = canvas.context2D;
          const fill = ops.find(op => op.name === 'fill');
          expect(fill).to.not.be.undefined;
          expect(fill.args[0]).to.equal('rgba(0, 255, 0, 0.4)');
          const stroke = ops.find(op => op.name === 'stroke');
          expect(stroke).to.not.be.undefined;
          expect(stroke.args[0]).to.equal('#fff');
          expect(stroke.args[1]).to.equal(4);
        });
      });
    })
    it('should draw corner point overlay', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render, toJSON }) => {
          let data;
          const onData = d => data = d;
          const el = createElement(BarcodeScanner, { 
            onData, 
            cornerPoints: {
              fill: 'rgba(255, 255, 255, 0.1)',
              stroke: '#0f0',
              lineWidth: 3,
            },
            scanInterval: 10,
          });
          const nodes = {};
          const createNodeMock = ({ type, props }) => {
            let node;
            if (type === 'video') {
              node = document.createElement('VIDEO');
              document.elements.VIDEO = [ node ];
            } else if (type === 'canvas') {
              node = document.createElement('CANVAS');
            } else {
              node = { ...props };
            }
            nodes[type] = node;
            return node;
          };
          await render(el, { createNodeMock });
          await delay(10);
          const { props } = toJSON();
          expect(props.className).to.equal('BarcodeScanner scanning');  
          const { video } = nodes;
          expect(video).to.not.be.undefined;
          const barcode = {
            format: 'qr_code',
            rawValue: 'Goodbye world',
            boundingBox: { 
              left: 10,
              top: 10,
              right: 100,
              bottom: 100,
              width: 90,
              height: 90,
            },
            cornerPoints: [
              { x: 10, y: 10 },
              { x: 100, y: 10 },
              { x: 100, y: 100 },
              { x: 10, y: 100 }
            ],
          }
          video.barcodes = [ barcode ];
          await delay(30);
          expect(data).to.equal('Goodbye world');
          const canvas = document.created.find(el => el.tagName === 'CANVAS');
          const { ops } = canvas.context2D;
          const fill = ops.find(op => op.name === 'fill');
          expect(fill).to.not.be.undefined;
          expect(fill.args[0]).to.equal('rgba(255, 255, 255, 0.1)');
          const stroke = ops.find(op => op.name === 'stroke');
          expect(stroke).to.not.be.undefined;
          expect(stroke.args[0]).to.equal('#0f0');
          expect(stroke.args[1]).to.equal(3);
        });
      });
    })
  })
  describe('#extractRadii', function() {
    it('should correctly handle the different possible inputs', function() {
      const n = extractRadii(10);
      expect(n).to.eql([ 10, 10, 10, 10 ]);
      const a0 = extractRadii([]);
      expect(a0).to.eql([ 0, 0, 0, 0 ]);
      const a1 = extractRadii([ 10 ]);
      expect(a1).to.eql([ 10, 10, 10, 10 ]);
      const a2 = extractRadii([ 10, 5 ]);
      expect(a2).to.eql([ 10, 5, 10, 5 ]);
      const a3 = extractRadii([ 10, 5, 2 ]);
      expect(a3).to.eql([ 10, 5, 2, 10 ]);
      const a4 = extractRadii([ 10, 5, 2, 1 ]);
      expect(a4).to.eql([ 10, 5, 2, 1 ]);
    })
  })
})