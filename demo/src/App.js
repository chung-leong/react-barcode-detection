import { useState } from 'react';
import { BarcodeScanner } from './react-barcode-detection';
import './css/App.css';

export default function App() {
  const [ data, setData ] = useState();
  const bb = {
    stroke: '#fff',
    radii: 10,
    lineWidth: 4,
    gap: 0.5,
    margin: 0.1
  };
  const cp = {
    fill: 'rgba(0, 255, 0, 0.4)',
  };
  return (
    <div className="App">
      <BarcodeScanner accept="qr_code" boundingBox={bb} cornerPoints={cp} onData={setData}>
        <div className="no-camera">
          <div className="sign">&#9940;</div>
        </div>
      </BarcodeScanner>
      <div className="data">{data}</div>
    </div>
  );
}

