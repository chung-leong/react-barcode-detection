import { useMediaCapture } from 'react-media-capture';
import { useSequentialState } from 'react-seq';

export function useBarcodeDetection(options = {}) {
  const {
    preferredDevice = 'back',
    selectNewDevice = true,
    accept = 'qr_code',
    scanInterval = 250,
    scanIntervalPositive = 50,
  } = options;
  const state = useMediaCapture({
    video: true,
    audio: false,
    active: typeof(BarcodeDetector) === 'function',
    preferredDevice, 
    selectNewDevice,
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
    console.log(status);
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
      await eventual.videoReadiness;

      // look for barcodes continually
      const detector = new window.BarcodeDetector({ formats });
      for (;;) {
        barcodes = await detector.detect(video);
        console.log(barcodes);
        yield currentState();
        const pause = (barcodes.length > 0) ? scanIntervalPositive : scanInterval;
        await eventual.dismount.for(pause).milliseconds;
      }
    } catch (err) {
      status = 'denied';
      lastError = err;
      console.error(err);
      yield currentState();
    }
  }, [ state, accept, scanInterval, scanIntervalPositive ]);
}