export async function withFakeDOM(cb) {
  const window = new Window();
  try {   
    for (const [ name, value ] of Object.entries(window)) {
      global[name] = value;
    }
    await cb();
  } finally {
    for (const [ name, value ] of Object.entries(window)) {
      delete global[name];
    }
  }
}

class Window extends EventTarget {
  constructor() {
    super();
    this.window = this;
    this.document = new Document();
    this.navigator = new Navigator();
    this.screen = new Screen();

    this.fetch = fetch;
    this.Blob = Blob;
    this.MediaRecorder = MediaRecorder;
    this.AudioContext = AudioContext;
    this.AnalyserNode = AnalyserNode;
    this.MediaStreamAudioSourceNode = MediaStreamAudioSourceNode;
    this.HTMLCanvasElement = HTMLCanvasElement;
    this.HTMLVideoElement = HTMLVideoElement;
    this.BarcodeDetector = BarcodeDetector;
    this.WebAssembly = {};
    this.Worker = Worker;

    this.workers = [];
  }
}

class Screen extends EventTarget {
  constructor() {
    super();
    this.orientation = new ScreenOrientation();
  }
}

class ScreenOrientation extends EventTarget {
  constructor() {
    super();
    this.angle = 0;
    this.type = 'langscape-primary';
  }

  rotate(angle = 90) {
    this.angle = (this.angle + angle) % 360;
    this.type = `${(this.angle % 180) ? 'portrait' : 'landscape'}-primary`;
    this.dispatchEvent(new Event('change'));
    window.dispatchEvent(new Event('orientationchange'));
    setTimeout(() => {
      window.dispatchEvent(new Event('resize')); 
    }, 5); 
  }
}

class Document extends EventTarget {
  constructor() {
    super();
    this.elements = {};
    this.created = [];
  }

  createElement(tagName) {
    tagName = tagName.toUpperCase();
    let element;
    if (tagName === 'VIDEO') {
      element = new HTMLVideoElement();
    } else if (tagName.toUpperCase() === 'CANVAS') {
      element = new HTMLCanvasElement();
    }
    if (element) {
      this.created.push(element);
    }
    return element;
  }

  getElementsByTagName(tagName) {
    tagName = tagName.toUpperCase();
    return this.elements[tagName] ?? [];
  }
}

class HTMLVideoElement extends EventTarget {
  constructor() {
    super();
    this.tagName = 'VIDEO';
    this.playing = false;
    this.loaded = false;
    this.srcObject = null;
    this.readyState = 0;
  }

  get videoWidth() {
    if (!this.loaded) {
      return 0;
    } else {
      if ((screen.orientation?.angle|0) % 180 === 0) {
        return 640;
      } else {
        return 350;
      }
    }
  }

  get videoHeight() {
    if (!this.loaded) {
      return 0;
    } else {
      if ((screen.orientation?.angle|0) % 180 === 0) {
        return 350;
      } else {
        return 640;
      }  
    }
  }

  play() {
    if (this.srcObject) {
      setTimeout(() => {
        try {
          this.srcObject.tap();
          this.loaded = true;
          this.playing = true;
          const evt = new Event('canplay');
          this.dispatchEvent(evt);
          this.oncanplay?.(evt);
        } catch (err) {
          const evt = new Event('canplay');
          evt.error = err;
          this.dispatchEvent(evt);
          this.onerror?.(evt);
        }
      }, 0);
    }
  }

  pause() {
    this.playing = false;
  }

  getTracks() {
    return this.tracks;
  }
}

class HTMLCanvasElement extends EventTarget {
  constructor() {
    super();
    this.tagName = 'CANVAS';
  }

  getContext(type) {
    if (type === '2d') {
      return new CanvasRenderingContext2D();
    }
  }

  toBlob(cb, mimeType, quality) {
    setTimeout(() => cb({ type: 'blob', type: mimeType }), 0);
  }

  toDataURL() {
    return 'data://';
  }
}

function fetch(url) {
  if (url === 'data://') {
    return {
      async blob() {
        return { type: 'blob' }
      }
    }
  } 
}

class CanvasRenderingContext2D {
  clearRect() {
    this.video = null;
  }

  drawImage(video) {
    this.video = video;
  }

  getImageData() {
    const { width, height, barcodes } = this.video;
    const data = new Uint8ClampedArray(0);
    const image = new ImageData(data, width, height);
    image.barcodes = barcodes;
    return image;
  }
}

class ImageData {
  constructor(data, width, height) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

class Navigator extends EventTarget {
  constructor() {
    super();
    this.mediaDevices = new MediaDevices();
    this.permissions = new Permissions();
    this.userAgent = '';
  }
}

class MediaDevices extends EventTarget {
  constructor() {
    super();
    this.devices = [];
    this.allow = true;
    this.granted = false;
    this.hideDevices = false;
  }

  async enumerateDevices() {
    if (this.hideDevices) {
      return [];
    }
    return this.devices.map((device) => {
      if (this.granted) {
        return device;
      } else {
        // no label until getUserMedia() is called
        return { ...device, label: '' };
      }
    });
  }

  addDevice(info) {
    this.devices.push(new MediaDeviceInfo(info));
    this.notifyChange();
  }

  removeDevice(deviceId) {
    const index = this.devices.findIndex(d => d.deviceId === deviceId);
    if (index !== -1) {
      this.devices.splice(index, 1);
      this.notifyChange();
    }
  }

  notifyChange() {
    const evt = new Event('devicechange');
    this.dispatchEvent(evt);
  }

  async getUserMedia(constraints) {
    if (!this.allow) {
      throw new Error('Permission denied');
    }
    const devices = [];
    for (const [ kind, value ] of Object.entries(constraints)) {
      let device;
      if (value.deviceId) {
        device = this.devices.find(d => d.deviceId === value.deviceId);
      }
      if (!device) {
        device = this.devices.find(d => d.kind === `${kind}input`);
      }
      if (device) {
        devices.push(device);
      }
    }
    if (devices.length === 0) {
      throw new Error('Unable to find a device matching constraint');
    } else {
      const stream = new MediaStream(devices);
      this.granted = true;
      return stream;
    }
  }
}

class MediaDeviceInfo {
  constructor(info) {
    Object.assign(this, info);
  }
}

class MediaStream extends EventTarget {
  constructor(devices) {
    super();
    this.videoWidth = 0;
    this.videoHeight = 0;
    this.tracks = devices.map(device => new MediaStreamTrack(device));
  }

  getTracks() {
    return this.tracks;
  }

  tap() {
    for (const track of this.tracks) {
      track.tap();
    }
  }
}

class MediaStreamTrack extends EventTarget {
  constructor(device) {
    super();
    if (device.kind === 'videoinput') { 
      this.kind = 'video';
    } else if (device.kind === 'audioinput') {
      this.kind = 'audio';
    }
    this.device = device;
    this.stopped = false;
  }

  stop() {
    this.stopped = true;
  }

  tap() {
    if (this.device.defective) {
      throw new Error('Device is defective');
    }
  }
}

class MediaRecorder extends EventTarget {
  constructor(stream, options) {
    super();
    this.stream = stream;
    this.options = options;
    this.recording = false;
    this.paused = false;
    this.stream.onData = (data) => {
      const evt = new Event('dataavailable');
      evt.data = data;
      this.dispatchEvent(evt);
    };
  }

  start(segment) {
    this.segment = segment;
    this.recording = true;
    setTimeout(() => {
      const evt = new Event('start');
      this.dispatchEvent(evt);
    }, 0);
  }

  stop() {
    this.recording = false;
    setTimeout(() => {
      const evt = new Event('stop');
      this.dispatchEvent(evt);
    }, 0);
  }

  pause() {
    this.recording = false;
    this.paused = true;
    setTimeout(() => {
      const evt = new Event('pause');
      this.dispatchEvent(evt);
    }, 0);
  }

  resume() {
    this.recording = true;
    this.paused = false;
    setTimeout(() => {
      const evt = new Event('resume');
      this.dispatchEvent(evt);
    }, 0);
  }
}

class Permissions {
  constructor() {
    this.camera = new Status();
    this.microphone = new Status();
  }

  async query({ name }) {
    return this[name];
  }
}

class Status extends EventTarget {  
}

class AudioContext {
  constructor() {
    this.sampleRate = 44000;
  }

  async resume() {    
  }

  close() {
  }
}

class AnalyserNode {
  constructor(context, { fftSize, smoothingTimeConstant }) {
    this.context = context;
    this.fftSize = fftSize;
    this.frequencyBinCount = fftSize >> 1;
    this.smoothingTimeConstant = smoothingTimeConstant;
    this.volume = -Infinity;
  }

  getFloatFrequencyData(buffer) {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = this.volume;
    }
  }

  onData({ volume }) {
    this.volume = volume;
  }
}

class MediaStreamAudioSourceNode {
  constructor(context, { mediaStream }) {
    this.context = context;
    this.stream = mediaStream;
    this.stream.onData = (data) => this.onData?.(data);
  }

  connect(destination) {
    this.onData = (data) => destination.onData?.(data);
  }

  disconnect(destination) {
    this.onData = undefined;
  }
}

class BarcodeDetector {
  async detect(source) {
    return source.barcodes ?? [];
  }
}

class Worker extends EventTarget {
  static list = [];

  constructor(url) {
    super();
    this.url = url;
    this.terminated = false;
    window.workers.push(this);
  }

  terminate() {
    this.terminated = true;
  }

  postMessage(msg, transfer) {
    if (msg.name === 'detect') {
      const [ image ] = msg.args;
      const result = image.barcodes ?? [];
      setTimeout(() => {
        const evt = new Event('message');
        evt.data = { type: 'result', result };
        this.dispatchEvent(evt);
      }, 0);
    }
  }
}

class Blob {
  constructor(list, meta) {
    this.list = list;
    this.meta = meta;
  }
}