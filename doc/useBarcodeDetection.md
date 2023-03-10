# useBarcodeDetection(options = {})

React hook that handles the actual scanning operation

## Syntax

```js
function Widget() {
  const {
    status,
    liveVideo,
    capturedImage,
    barcodes,
  } = useBarcodeDetection({ snapshot: true });
  let content;
  if (status === 'scanning') {
    content = <StreamVideo srcObject={liveVideo.stream} />;
  } else if (status === 'recorded') {
    content = <BlobImage srcObject={capturedImage.blob} />;
  } else if (status === 'denied') {
    content = <div>Feature not available</div>;
  } else {
    content = <div>Please wait...</div>;
  }
  let overlay;
  if (barcodes.length > 0) {
    /* ... */
  }
  return (
    <div className="Widget">
      {content}
      {overlay}
    </div>
  );
}
```

## Parameters

* `options` - `<Object>`
* `return` `{ ...state, ...methods }`

## Options

* `active` - `<booleab>` Whether the hook is active (default: `true`)
* `accept` - `<string>` Comma-delimited list of barcodes format to look for (default: `"qr_code"`)
* `use` - `<string>` Comma-delimited list of methods to try (default: `"api,jsqr"`)
* `snapshot` - `<booleab>` Take a snapshot of the video immediately upon code detection 
(default: `false`)
* `scanInterval` - `<number>` Time interval in millisecond between scans after an unsuccessful
attempt (default: `250`)
* `scanIntervalPositive` - `<number>` Time interval in millisecond between scans after a code is
found (default: `50`)
* `clearInterval` - `<number>` Duration of time in millisecond to wait when the hook fails to see
a barcode before it clears a previously found code (default: `250`)
* `preferredDevice` - `<string>` Which camera to use on devices with more than one 
(default: `"back"`)
* `selectNewDevice` - `<boolean>` Select newly plugged-in camera automatically (default: `true`)

## State variables

* `status` - `<string>` The current status, which can be one of the following:
  * "pending" - `active` is false and the hook is not doing anything.
  * "acquiring" - The hook is trying to obtain access to a camera.
  * "scanning" - The hook is actively scanning for barcodes.
  * "recorded" - `snapshot` is true and the hook has found one or more barcodes.
  * "denied" - The user has turned down the request to use the camera, or one isn't 
  available. Or the browser does not support the Barcode Detection API and a format 
  other than qr_code is listed in `accept`.
* `liveVideo` - `<Object>` A live video stream, with the following properties:
  * `stream`: `<MediaStream>`
  * `width`: `<number>`
  * `height`: `<number>`
* `capturedImage` - `<Object>` A JPEG snapshot of the video, with the following properties:
  * `blob`: `<Blob>` 
  * `width`: `<number>`
  * `height`: `<number>`
* `barcodes` - `<Object[]>` Barcodes found in the video, each with the following properties:
  * `format`: `<string>`
  * `rawValue`: `<string>`
  * `boundingBox`: `<DOMRectReadOnly>`
  * `cornerPoints`: `<Point[]>`
* `devices` - `<Object[]>` List of available cameras, each with the following properties:
  * `id`: `<string>`
  * `label`: `<string>`
* `selectedDeviceId` - `<string>` ID of the currently selected camera
* `lastError` - `<Error>` The last error encountered by the hook

## Methods

* `selectDevice(deviceId)` - Selecting a different device

## Notes

The hook will return a status of "pending" if `active` is false. 

The hook will return a status of "denied" if there is no camera available or if the formats 
listed in `accept` is not supported by the browser.

The status will become "denied" when an error is encountered.

When there is more than one method listed in `use`, the first one supported by the device will 
be chosen. For less-powerful mobile devices [`quirc`](https://github.com/dlbeer/quirc) might 
be preferrable to [`jrqr`](https://github.com/cozmo/jsQR).
