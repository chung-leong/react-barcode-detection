import { useMediaCapture } from 'react-media-capture';
import { useSequentialState } from 'react-seq';
import { useRef } from 'react';

export function useBarcodeDetection(options = {}) {
  const isMobileDevice = /Mobi/i.test(window.navigator.userAgent);
  const {
    active = true,
    preferredDevice = 'back',
    selectNewDevice = true,
    accept = 'qr_code',
    use = isMobileDevice ? 'api,quirc,jsqr' : 'api,jsqr',
    snapshot = false,
    scanInterval = 250,
    scanIntervalPositive = 50,
    clearInterval = 250,
  } = options;
  const method = selectMethod(use);
  const supported = hasSupport(method, accept);
  const state = useMediaCapture({
    video: true,
    audio: false,
    active: active && supported,
    preferredDevice, 
    selectNewDevice,
    watchVolume: false,
  });
  const snapshotBarcodes = useRef();
  return useSequentialState(async function*({ initial, manageEvents, signal }) {
    const formats = split(accept);
    const {
      liveVideo,
      capturedImage,
      devices,
      selectedDeviceId,

      snap,
      clear,
      selectDevice,
    } = state;
    let {
      status,
      lastError,
    } = state;
    let barcodes = [];
    const [ on, eventual ] = manageEvents();
    
    function currentState() {
      return {
        status,
        liveVideo,
        capturedImage,
        devices,
        barcodes,
        selectedDeviceId,
        selectDevice,
        lastError,
      };
    }

    if (!supported) {
      status = 'denied';
    } else if (status === 'previewing') {
      status = 'scanning';
    } else if (status === 'recorded') {
      // barcodes captured by previous generator just prior to call to snap()
      barcodes = snapshotBarcodes.current;
      capturedImage.clear = clear;
    }
    initial(currentState());
    if (status !== 'scanning') {
      return;
    }

    try {
      // look for video element that's using the live stream
      const { stream } = liveVideo;
      const elements = [ ...document.getElementsByTagName('VIDEO') ];
      let video = elements.find(v => v.srcObject === stream);
      if (!video) {
        // create video element and wait for it to come online
        video = document.createElement('VIDEO');
        video.srcObject = liveVideo.stream;
        video.muted = true;
        video.playsInline = true;
        video.oncanplay = on.videoReadiness;
        video.onerror = on.videoReadiness.throw;
        video.play();      
        await eventual.videoReadiness;  
      }
      // use a generator to isolate the barcode detection code
      const generator = (async function*() {
        if (method === 'api') {
          const detector = new window.BarcodeDetector({ formats });
          for (;;) {
            yield detector.detect(video);
          }
        } else if (method === 'quirc' || method === 'jsqr') {
          // need to pass static string to URL in order for Webpack to pick it up
          let worker;
          if (method === 'quirc') {
            worker = new Worker(new URL('./quirc-worker.js', import.meta.url));
          } else {
            worker = new Worker(new URL('./jsqr-worker.js', import.meta.url));
          }
          // our "poor-man's comlink", as that lib doesn't work well with CRA
          worker.addEventListener('message', on.message, { signal });
          const call = async (name, args, transfer) => {
            worker.postMessage({ name, args }, transfer);
            const { message: { data } } = await eventual.message;
            if (data.type === 'error') {
              throw new Error(data.message);
            } else {
              return data.result;
            }
          };
          try {
            const { videoWidth, videoHeight } = video;
            const canvas = document.createElement('CANVAS');
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            const context = canvas.getContext('2d');
            for (;;) {
              // draw into canvas and obtain image data
              context.clearRect(0, 0, 100, 100);
              context.drawImage(video, 0, 0, videoWidth, videoHeight);
              const image = context.getImageData(0, 0, videoWidth, videoHeight);
              // transfer image data to worker
              yield call('detect', [ image ], [ image.data.buffer ]);        
            }  
          } finally {
            // this will execute when the caller exits out of its 
            // for-await-of loop 
            worker.terminate();
          }
        }
      })();
      let clearAllowance = 0;
      for await (const newBarcodes of generator) {
        if (newBarcodes.length > 0) {
          barcodes = newBarcodes;
          if (snapshot) {
            // calling snap() will cause useMediaCapture() to return a new state,
            // which would shutdown this generator; the new generator will pick up 
            // the barcodes and yield it along with capturedImage
            snap();
            snapshotBarcodes.current = barcodes;
            return;
          }
          yield currentState();
          clearAllowance = clearInterval;
        } else if (barcodes.length > 0) {
          clearAllowance -= scanInterval;
          if (clearAllowance <= 0) {
            barcodes = newBarcodes;
            yield currentState();  
          }
        }
        const interval = (barcodes.length > 0) ? scanIntervalPositive : scanInterval;
        // nothing calls on.unmount--statement will throw, however, when the 
        // component is unmounted
        await eventual.unmount.for(interval).milliseconds;
      }
    } catch (err) {
      status = 'denied';
      lastError = err;
      yield currentState();
    }
  }, [ state, method, supported, accept, snapshot, scanInterval, scanIntervalPositive, clearInterval ]);
}

function selectMethod(use) {
  for (const method of split(use)) {
    if (method === 'api') {
      if (typeof(BarcodeDetector) === 'function') {
        return method;
      }
    } else if (method === 'quirc') {
      if (typeof(WebAssembly) === 'object' && typeof(Worker) === 'function') {
        return method;
      }
    } else if (method === 'jsqr' && typeof(Worker) === 'function') {
      return method;
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Unknown method: ${method}`);
      }
    }
  }
}

function hasSupport(method, accept) {
  const formats = split(accept);
  const available = getSupportedFormats(method);
  const missing = formats.filter(f => !available.includes(f));
  if (missing.length === 0) {
    return true;
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`No support for barcode format(s): ${missing.join(', ')}`);
    }
    return false;
  }
}

function getSupportedFormats(method) {
  if (method === 'api') {
    return [ 
      'aztec', 
      'code_128', 
      'code_39', 
      'code_93', 
      'codabar', 
      'data_matrix', 
      'ean_13', 
      'ean_8', 
      'itf',  
      'pdf417',
      'qr_code',
      'upc_a',
      'upc_e'
    ];
  } else if (method === 'quirc' || method === 'jsqr') {
    return [ 'qr_code' ];
  } else {
    return [];
  }
}

function split(s) {
  return s.trim().split(/\s*,\s*/);
}
