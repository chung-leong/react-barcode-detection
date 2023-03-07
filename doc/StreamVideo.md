# StreamVideo

Component for displaying a live video stream

## Syntax

```js
  const { stream } = liveVideo;
  return <StreamVideo srcObject={stream}>
```

## Props

* `srcObject` - `<MediaStream>` A media stream from [`useMediaCapture`](./useMediaCapture.md).

## Notes

Component also accepts props appropriate for a `<video>` element.