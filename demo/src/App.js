import './css/App.css';
import { useBarcodeDetection } from './hooks.js';
import { StreamVideo } from 'react-media-capture';
import { BarcodeOverlay } from './components.js';

export default function App() {
  const { 
    liveVideo,
    barcodes,
  } = useBarcodeDetection();
  const { stream: srcObject, width, height } = liveVideo ?? {};
  const cornerPoints = { fill: 'rgba(255, 0, 0, 0.5)' };  
  return (
    <div className="App">
      <StreamVideo {...{ srcObject, width, height }} />
      <BarcodeOverlay {...{ barcodes, width, height, cornerPoints } } />
    </div>
  );
}

