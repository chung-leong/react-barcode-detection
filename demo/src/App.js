import './css/App.css';
import { useBarcodeDetection } from './hooks';
import { StreamVideo } from 'react-media-capture';

export default function App() {
  const { 
    liveVideo,
  } = useBarcodeDetection();
  const { stream, width, height } = liveVideo ?? {};
  return (
    <div>
      <StreamVideo srcObject={stream} width={width} height={height} />
    </div>
  );
}
