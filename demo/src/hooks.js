import { useMediaCapture } from 'react-media-capture';
import { useSequentialState } from 'react-seq';

export function useBarcodeDetection(options = {}) {
  const {
    active = true,
    preferredDevice = 'back',
    selectNewDevice = true,
    accept = 'qr_code,upc_a,ean_13',
    scanInterval = 250,
    scanIntervalPositive = 50,
    clearInterval = 250,
  } = options;
  const state = useMediaCapture({
    video: true,
    audio: false,
    active: active && typeof(BarcodeDetector) === 'function',
    preferredDevice, 
    selectNewDevice,
    watchVolume: false,
  });
  return useSequentialState(async function*({ initial, manageEvents }) {
    const formats = accept.trim().split(/\s*,\s*/);
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

    if (typeof(BarcodeDetector) !== 'function') {
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
    
      // look for barcodes continually
      const detector = new window.BarcodeDetector({ formats });
      let clearAllowance = 0;
      for (;;) {
        const newBarcodes = await detector.detect(video);
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
  }, [ state, accept, scanInterval, scanIntervalPositive, clearInterval ]);
}