import { useState } from 'react';
import { BarcodeScanner } from 'react-barcode-detection';
import './css/App.css';

export default function App() {
  const [ data, setData ] = useState();
  return (
    <div className="App">
      <BarcodeScanner accept="qr_code" onData={setData}>
        <div className="no-camera">
          <div className="sign">&#9940;</div>
        </div>
      </BarcodeScanner>
      <div className="data">{data}</div>
    </div>
  );
}

