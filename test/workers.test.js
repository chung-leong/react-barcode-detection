import { expect } from 'chai';
import { readFile } from 'fs/promises';
import { get } from '@andreekeberg/imagedata';
import { delay } from 'react-seq';

describe('Workers', function() {
  const workers = {};
  let resolve, reject;
  before(async () => {
    global.addEventListener = (type, listener) => workers.jsqr = listener;
    await import('../src/jsqr-worker.js');
    global.addEventListener = (type, listener) => workers.quirc = listener;
    global.self = { location: { href: '' } };
    global.fetch = async (url) => {
      return {
        async arrayBuffer() {
          const buffer = await readFile(url);
          return buffer;
        }
      };
    };
    global.DOMRectReadOnly = class DOMRectReadOnly {
      constructor(left, top, width, height) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
        this.right = left + width;
        this.bottom = top + height;
      }
    };
    await import('../src/quirc-worker.js');
    global.postMessage = (msg) => {
      if (msg.type === 'error') {
        reject(new Error(msg.message));
      } else {
        resolve(msg.result);
      }
    };
    global.call = async (target, name, args) => {
      const promise = new Promise((r1, r2) => { resolve = r1; reject = r2; });
      await target({ data: { name, args } });
      return promise;
    };
  })
  after(async ()=> {
    delete global.addEventListener;
    delete global.postMessage;
    delete global.fetch;
    delete global.self;
    delete global.DOMRectReadOnly;
    delete global.call;
  })

  function testTarget(name, folder, file, ...values) {
    it(`should extract QR-code: ${file}`, async function() {
      this.timeout(5000);
      const image = await loadImage(folder, file);
      const barcodes = await call(workers[name], 'detect', [ image ]);
      const rawValues = barcodes.map(c => c.rawValue);
      console.log(rawValues);
      for (const value of values) {
        expect(rawValues).to.contain(value);
      }
      await delay(50);
    })
  }

  describe('#jsqr-worker', function() {
    const test = (...args) => testTarget('jsqr', ...args);

    test('easy', 'wikipedia.jpg', 'http://en.m.wikipedia.org');
    test('easy', 'wikipedia-inv.jpg', 'http://en.m.wikipedia.org');
    test('easy', 'shift-jis.png', 'ようこそ、フリー百科事典へ！');

    test('photos', 'IMG_0459.jpeg', '');
    test('photos', 'IMG_0460.jpeg', '');
    test('photos', 'IMG_0461.jpeg', 'https://www.pmicareers.pl/job-offers?limit=10&page=1&cities=2&teams=9,10&utm_source=qr-code&utm_medium=digital-citylight&utm_campaign=pmicareers-krakow_marzec-2023&utm_term=krakow-63_plac_wszystkich_swietych&utm_content=fabryka');
    test('photos', 'IMG_0462.jpeg', 'https://me-qr.com/sGE3O5Z');
    test('photos', 'IMG_0463.jpeg', 'https://www.pologne.campusfrance.org/pl');
    test('photos', 'IMG_0464.jpeg', 'https://app.adjust.com/559yxpx?fallback=https%3A%2F%2Fwww.glovoapp.com%2Fpl');
    test('photos', 'IMG_0465.jpeg', 'https://me-qr.com/15032608');
    test('photos', 'IMG_0466.jpeg', 'https://www.germany4ukraine.de/hilfeportal-ua?mtm_campaign=G4U&mtm_medium=A3Plakat');
    test('photos', 'IMG_0467.jpeg', '');
    test('photos', 'IMG_0468.jpeg', 'www.pekao.com.pl/rodo/monitoring');
    test('photos', 'IMG_0469.jpeg', 'https://yes.mokka.pl/');
    test('photos', 'IMG_0471.jpeg', 'https://free-qr.com/link/JDGbVkOihp70CvTk');
  })
  describe('#quirc-worker', function() {
    const test = (...args) => testTarget('quirc', ...args);

    test('easy', 'wikipedia.jpg', 'http://en.m.wikipedia.org');
    test('easy', 'wikipedia-inv.jpg', 'http://en.m.wikipedia.org');
    //test('easy', 'shift-jis.png', 'ようこそ、フリー百科事典へ！');
  })
})

async function loadImage(folder, file) {
  const { pathname } = new URL(`./images/${folder}/${file}`, import.meta.url);
  const imageData = await new Promise((resolve, reject) => {
    get(pathname, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
  return imageData;
}

