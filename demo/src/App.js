import './css/App.css';
import { useBarcodeDetection } from './hooks';
import { StreamVideo } from 'react-media-capture';

export default function App() {
  const { 
    liveVideo: { stream, width, height },
  } = useBarcodeDetection();
  return (
    <div>
      <StreamVideo srcObject={stream} width={width} height={height} />
    </div>
  );
}
