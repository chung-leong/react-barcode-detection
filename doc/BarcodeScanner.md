# BarcodeScanner

React component for scanning barcodes

## Syntax

```js
const bb = {
  stroke: '#fff',
  lineWidth: 4,
  radii: 10,
  gap: 0.5,
  margin: 0.1
};

function QRScreen() {
  const [ data, setData ] = useState();
  return (
    <div className="QRScreen">
      <BarcodeScanner boundingBox={bb} onData={setData} />;
      <div className="data">{data}</div>
    </div>
  );
}
```

## Props

* `boundingBox` - `<Object>` Style object for the barcode bounding box, with the 
following properties :
  * `fill`: `<string>`
  * `stroke`: `<string>`
  * `lineWidth`: `<number>`
  * `radii`: `<number>` or `<number[]>`
  * `gap`: `<number>`
  * `margin`: `<number>`
* `cornerPoints` - `<Object>` Style object for the barcode corner points, with the 
following properties:
  * `fill`: `<string>`
  * `stroke`: `<string>`
  * `lineWidth`: `<number>`
* `onData` - `<Function>` Callback receiving data from the first detected barcode
* `onBarcodes` - `<Function>` Callback receiving all detected barcodes, each with the 
following properties:
  * `format`: `<string>`
  * `rawValue`: `<string>`
* `onSnapshot` - `<Function>` Callback receiving a snapshot of the video when a 
barcode is detected, an object with the following properties:
  * `blob`: `<Blob>`
  * `width`: `<number>`
  * `height`: `<number>`
  * `clear`: `<Function>`
* `active` - `<booleab>` Whether the component is active (default: `true`)
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

## Notes

Use `onBarcodes` instead of `onData` when you need to know the barcode format (because 
you're looking for more than one type) or when you're trying to capture multiple barcodes 
at once.

When a `onSnapshot` is provided, the scanning process will stop as soon as a barcode is 
detected. Call `clear` to restart the process.

`onSnapshot` is called at the same time as `onData` and `onBarcodes` (i.e. your component
will receive the barcode data and the snapshot in the same update cycle).

`fill` and `stroke` correspond to 
[`fillStyle`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillStyle)
and 
[`strokeStyle](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle)
of `CanvasRenderingContext2D`. Consult the documentation at Mozilla for more details. 

`radii` is interpreted in the same way as done by 
[`roundRect`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect) 
(although that method is not used). By supplying an array of number you can control the roundness 
of the individual corners.

`gap` is a fraction of the width and height to leave open in the middle of the rectangle. When 
it's greater than zero the rectangle will not fill correctly.

`margin` is also a fraction of the width and height. Positive value makes the rectangle bigger.