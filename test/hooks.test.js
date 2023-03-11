import { expect } from 'chai';
import { createElement } from 'react';
import { withTestRenderer, withSilentConsole } from './test-renderer.js';
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
    it('should use jsqr when there is no BarcodeDetector', async function() {
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
          await delay(50);
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
        const WebAssembly = global.WebAssembly;
        delete window.WebAssembly;
        delete global.WebAssembly;
        try {
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
            await delay(50);
            const { barcodes } = state;
            expect(barcodes).to.have.lengthOf(1);
          }); 
        } finally {
          global.WebAssembly = WebAssembly;
        }
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
          await delay(50);
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
          await delay(50);
          const { barcodes } = state;
          expect(barcodes).to.have.lengthOf(1);
        });
      });
    })
    it('should receive error from worker', async function() {
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
          video.error = new Error('Doh!');
          const [ worker ] = window.workers;
          expect(worker).to.not.be.undefined;
          expect(worker.url.toString()).to.contain('quirc-worker');
          await delay(50);
          const { barcodes, lastError } = state;
          expect(lastError).to.be.an('error');
          expect(lastError.message).to.equal('Doh!');
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
          await delay(50);
          const { barcodes, capturedImage } = state;
          expect(barcodes).to.have.lengthOf(1);
          expect(capturedImage).to.not.be.undefined;
          expect(capturedImage.blob.type).to.equal('image/jpeg');
        });
      });
    })
    it('should clear barcodes when clear interval is reached', async function() {
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
            state = useBarcodeDetection({ scanInterval: 25, scanIntervalPositive: 5, clearInterval: 50 });
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
          const { barcodes: before } = state;
          expect(before).to.have.lengthOf(1);
          video.barcodes = [];
          await delay(15);
          const { barcodes: after15 } = state;
          expect(after15).to.have.lengthOf(1);
          await delay(15);
          const { barcodes: after30 } = state;
          expect(after30).to.have.lengthOf(1);
          await delay(45);
          const { barcodes: after75 } = state;
          expect(after75).to.have.lengthOf(0);
        });
      });
    })
    it('should output warning to console when method is unrecognized', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render }) => {
          const output = {};
          await withSilentConsole(async () => {
            let state;
            function Test() {
              state = useBarcodeDetection({ use: 'cocaine' });
              return null;                
            }
            const el = createElement(Test);
            await render(el);
            await delay(10);
            const { status, liveVideo } = state;
            expect(status).to.equal('denied');  
          }, output);
          expect(output.warn).to.contain('cocaine');
        });
      });
    })
    it('should output warning to console when format is not supported', async function() {
      await withFakeDOM(async () => {
        navigator.mediaDevices.addDevice({
          deviceId: '007',
          groupId: '007',
          kind: 'videoinput',
          label: 'Spy camera',
        });
        await withTestRenderer(async ({ render }) => {
          const output = {};
          await withSilentConsole(async () => {
            let state;
            function Test() {
              state = useBarcodeDetection({ accept: 'cocaine' });
              return null;                
            }
            const el = createElement(Test);
            await render(el);
            await delay(10);
            const { status, liveVideo } = state;
            expect(status).to.equal('denied');  
          }, output);
          expect(output.warn).to.contain('cocaine');
        });
      });
    })
  })
})