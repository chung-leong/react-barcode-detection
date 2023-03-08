import { expect } from 'chai';
import { createElement } from 'react';
import { withTestRenderer } from './test-renderer.js';
import { withFakeDOM } from './fake-dom.js';
import { delay } from 'react-seq';

import { 
  useBarcodeDetection,
} from '../index.js';

describe('Hooks', function() {
  describe('#useBarcodeDetection', function() {
    it('should not throw error when there is no DOM', async function() {
      await withTestRenderer(async ({ render }) => {
        let state;
        function Test() {
          state = useBarcodeDetection();
          return null;
        }
        const el = createElement(Test);
        await render(el);
        const { status } = state;
        expect(status).to.equal('denied');
      });
    })
    it('should return a status of pending even when there is no DOM when active is false', async function() {
      await withTestRenderer(async ({ render }) => {
        let state;
        function Test() {
          state = useBarcodeDetection({ active: false });
          return null;
        }
        const el = createElement(Test);
        await render(el);
        const { status } = state;
        expect(status).to.equal('pending');
      });
    })
    it('should deny request when there are no devices', async function() {
      await withFakeDOM(async () => {
        await withTestRenderer(async ({ render }) => {
          let state;
          function Test() {
            state = useBarcodeDetection();
            return null;                
          }
          const el = createElement(Test);
          await render(el);
          await delay(10);
          const { status, lastError } = state;
          expect(status).to.equal('denied');
          expect(lastError).to.be.an('error');
        });
      });      
    })
    it('should reach the state of scanning when there is a device', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render }) => {
          let state;
          function Test() {
            state = useBarcodeDetection();
            return null;                
          }
          const el = createElement(Test);
          await render(el);
          await delay(10);
          const { status, lastError, liveVideo } = state;
          expect(status).to.equal('scanning');
          expect(lastError).to.be.undefined;
          expect(liveVideo).to.be.an('object');
          expect(liveVideo.width).to.be.at.least(100);
          expect(liveVideo.height).to.be.at.least(100);
        });
      });
    })
    it('should use existing video element if there is one', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render }) => {
          let state;
          let video;
          function Test() {
            state = useBarcodeDetection();
            const { liveVideo } = state;
            if (liveVideo && !video) {
              video = document.createElement('VIDEO');
              video.srcObject = liveVideo.stream;
              document.elements.VIDEO = [ video ];
            }
            return null;                
          }
          const el = createElement(Test);
          await render(el);
          await delay(10);
          const { status, barcodes } = state;
          expect(status).to.equal('scanning');
          expect(barcodes).to.have.lengthOf(0);
          video.play();
          video.barcodes = [ { rawValue: 'hello world', type: 'qr_code' } ];
          await delay(10);
          const { barcodes:after } = state;
          expect(after).to.have.lengthOf(1);
        });
      });
    })
    it('should create video element if one is not present', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render }) => {
          let state;
          let createdBefore;
          function Test() {
            state = useBarcodeDetection();
            const { liveVideo } = state;
            if (liveVideo) {
              createdBefore = document.created.slice();
            }
            return null;                
          }
          const el = createElement(Test);
          await render(el);
          await delay(10);
          const { status, liveVideo: { stream } } = state;
          expect(status).to.equal('scanning');
          const video = document.created.find(v => v.srcObject === stream );
          expect(video).to.not.be.undefined;
          expect(createdBefore).to.not.include(video);
        });
      });
    })
    it('should use jsqr on when there is no BarcodeDetector', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        delete window.BarcodeDetector;
        delete global.BarcodeDetector;
        await withTestRenderer(async ({ render }) => {
          let state;
          function Test() {
            state = useBarcodeDetection({ scanInterval: 25 });
            return null;                
          }
          const el = createElement(Test);
          await render(el);
          await delay(10);
          const { status, liveVideo: { stream } } = state;
          expect(status).to.equal('scanning');
          const video = document.created.find(v => v.srcObject === stream);
          expect(video).to.not.be.undefined;
          video.barcodes = [ { rawValue: 'hello world', type: 'qr_code' } ];
          const [ worker ] = window.workers;
          expect(worker).to.not.be.undefined;
          expect(worker.url.toString()).to.contain('jsqr-worker');
          await delay(35);
          const { barcodes } = state;
          expect(barcodes).to.have.lengthOf(1);
        });
      });
    })
    it('should use jsqr on when there is no BarcodeDetector or WebAssembly', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        delete window.BarcodeDetector;
        delete global.BarcodeDetector;
        delete window.WebAssembly;
        delete global.WebAssembly;
        await withTestRenderer(async ({ render }) => {
          let state;
          function Test() {
            state = useBarcodeDetection({ use: 'api,quirc,jsqr', scanInterval: 25 });
            return null;                
          }
          const el = createElement(Test);
          await render(el);
          await delay(10);
          const { status, liveVideo: { stream } } = state;
          expect(status).to.equal('scanning');
          const video = document.created.find(v => v.srcObject === stream);
          expect(video).to.not.be.undefined;
          video.barcodes = [ { rawValue: 'hello world', type: 'qr_code' } ];
          const [ worker ] = window.workers;
          expect(worker).to.not.be.undefined;
          expect(worker.url.toString()).to.contain('jsqr-worker');
          await delay(35);
          const { barcodes } = state;
          expect(barcodes).to.have.lengthOf(1);
        });
      });
    })
    it('should use jsqr on when only jsqr is specified', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render }) => {
          let state;
          function Test() {
            state = useBarcodeDetection({ use: 'jsqr', scanInterval: 25 });
            return null;                
          }
          const el = createElement(Test);
          await render(el);
          await delay(10);
          const { status, liveVideo: { stream } } = state;
          expect(status).to.equal('scanning');
          const video = document.created.find(v => v.srcObject === stream);
          expect(video).to.not.be.undefined;
          video.barcodes = [ { rawValue: 'hello world', type: 'qr_code' } ];
          const [ worker ] = window.workers;
          expect(worker).to.not.be.undefined;
          expect(worker.url.toString()).to.contain('jsqr-worker');
          await delay(35);
          const { barcodes } = state;
          expect(barcodes).to.have.lengthOf(1);
        });
      });
    })
    it('should use quirc on when WebAssembly is available', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render }) => {
          let state;
          function Test() {
            state = useBarcodeDetection({ use: 'quirc,jsqr', scanInterval: 25 });
            return null;                
          }
          const el = createElement(Test);
          await render(el);
          await delay(10);
          const { status, liveVideo: { stream } } = state;
          expect(status).to.equal('scanning');
          const video = document.created.find(v => v.srcObject === stream);
          expect(video).to.not.be.undefined;
          video.barcodes = [ { rawValue: 'hello world', type: 'qr_code' } ];
          const [ worker ] = window.workers;
          expect(worker).to.not.be.undefined;
          expect(worker.url.toString()).to.contain('quirc-worker');
          await delay(35);
          const { barcodes } = state;
          expect(barcodes).to.have.lengthOf(1);
        });
      });
    })
    it('should capture image when snapshot is true', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render }) => {
          let state;
          function Test() {
            state = useBarcodeDetection({ scanInterval: 25, snapshot: true });
            return null;                
          }
          const el = createElement(Test);
          await render(el);
          await delay(10);
          const { status, liveVideo: { stream } } = state;
          expect(status).to.equal('scanning');
          const video = document.created.find(v => v.srcObject === stream);
          expect(video).to.not.be.undefined;
          video.barcodes = [ { rawValue: 'hello world', type: 'qr_code' } ];
          await delay(35);
          const { barcodes, capturedImage } = state;
          expect(barcodes).to.have.lengthOf(1);
          expect(capturedImage).to.not.be.undefined;
          expect(capturedImage.blob.type).to.equal('image/jpeg');
        });
      });
    })


  })
})