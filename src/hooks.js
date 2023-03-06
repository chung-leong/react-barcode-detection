import { useMediaCapture } from 'react-media-capture';
import { useSequentialState } from 'react-seq';

export function useBarcodeDetection(options = {}) {
  const isMobileDevice = /Mobi/i.test(window.navigator.userAgent);
  const {
    active = true,
    preferredDevice = 'back',
    selectNewDevice = true,
    accept = 'qr_code',
    use = isMobileDevice ? 'api,wasm,js' : 'api,js',
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
  return useSequentialState(async function*({ initial, manageEvents }) {
    const formats = split(accept);
    const {
      liveVideo,
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
        devices,
        selectedDeviceId,
        barcodes,
        lastError,

        snap,
        clear,
        selectDevice,
      };
    }

    if (!supported) {
      status = 'denied';
    } else if (status === 'previewing') {
      status = 'scanning';
    }
    initial(currentState());
    if (status !== 'scanning') {
      return;
    }

    try {
      // create video element and wait for it to come online
      const video = document.createElement('VIDEO');
      video.srcObject = liveVideo.stream;
      video.muted = true;
      video.oncanplay = on.videoReadiness;
      video.onerror = on.videoReadiness.throw;
      video.play();
      await eventual.videoReadiness;
    
      // create generator
      const generator = (async function *() {
        if (method === 'api') {
          const detector = new window.BarcodeDetector({ formats });
          for (;;) {
            yield detector.detect(video);
          }
        } else if (method === 'wasm' || method === 'js') {
          // need to pass static string to URL in order for Webpack to pick it up
          let worker;
          if (method === 'wasm') {
            worker = new Worker(new URL('./quirc-worker.js', import.meta.url));
          } else {
            worker = new Worker(new URL('./jsqr-worker.js', import.meta.url));
          }
          // our "poor-man's comlink", as that lib doesn't work well with CRA
          const call = async (name, args, transfer) => {
            worker.postMessage({ name, args }, transfer);
            worker.addEventListener('message', on.message, { once: true });
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
            const context = canvas.getContext('2d', { willReadFrequently: true });
            for (;;) {
              // draw into canvas and obtain image data
              context.drawImage(video, 0, 0, videoWidth, videoHeight);
              const image = context.getImageData(0, 0, videoWidth, videoHeight);
              // transfer image data to worker
              yield call('detect', [ image ], [ image.data.buffer ]);        
            }  
          } finally {
            worker.terminate();
          }
        }
      })();
      // look for barcodes continually
      let clearAllowance = 0;
      for await (const newBarcodes of generator) {
        if (newBarcodes.length > 0) {
          barcodes = newBarcodes;
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
        await eventual.dismount.for(interval).milliseconds;
      }
    } catch (err) {
      status = 'denied';
      lastError = err;
      yield currentState();
    }
  }, [ state, method, supported, accept, scanInterval, scanIntervalPositive, clearInterval ]);
}

function selectMethod(use) {
  const methods = split(use);
  for (const method of method) {
    if (method === 'api') {
      if (typeof(BarcodeDetector) === 'function') {
        return method;
      }
    } else if (method === 'wasm') {
      if (typeof(WebAssembly) === 'object') {
        return method;
      }
    } else if (method === 'js') {
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
  } else if (method === 'wasm' || method === 'js') {
    return [ 'qr_code' ];
  } else {
    return [];
  }
}

function split(s) {
  return s.trim().split(/\s*,\s*/);
}
