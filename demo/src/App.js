import { useState, useCallback } from 'react';
import { BarcodeScanner } from 'react-barcode-detection';
import './css/App.css';

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

export default function App() {
  const [ type, setType ] = useState('ContinuousScan');
  const [ api, setAPI ] = useState(true);
  const [ quirc, setQuirc ] = useState(false);
  const [ jsqr, setJSQR ] = useState(true);
  const Component = ({ ContinuousScan, SnapAndHold, FindAndStop })[type];
  const methods = [];
  if (api) {
    methods.push('api');
  }
  if (quirc) {
    methods.push('quirc');
  }
  if (jsqr) {
    methods.push('jsqr');
  }
  return (
    <div className="App">
      <nav>
        <span className={api ? 'on' : 'off'} onClick={() => setAPI(v => !v)}>A</span>
        <span className={quirc ? 'on' : 'off'} onClick={() => setQuirc(v => !v)}>Q</span>
        <span className={jsqr ? 'on' : 'off'} onClick={() => setJSQR(v => !v)}>J</span>
      </nav>
      <select onChange={(e) => setType(e.target.value)}>
        <option value="ContinuousScan">Continuous scan</option>
        <option value="SnapAndHold">Snap and hold</option>
        <option value="FindAndStop">Find and stop</option>
      </select>
      <Component use={methods.join(',')}/>
    </div>
  );
}

function ContinuousScan({ use }) {
  const [ data, setData ] = useState();
  return (
    <div>
      <BarcodeScanner boundingBox={bb} cornerPoints={cp} use={use} onData={setData}>
        <NoCamera />
      </BarcodeScanner>
      <BarcodeData type="overlay" data={data} />
    </div>
  );
}

function SnapAndHold({ use }) {
  const [ data, setData ] = useState();
  const [ snapshot, setSnapshot ] = useState();
  return (
    <div>
      <BarcodeScanner boundingBox={bb} cornerPoints={cp} use={use} onData={setData} onSnapshot={setSnapshot}>
        <NoCamera />
      </BarcodeScanner>
      <BarcodeData type="overlay" data={data} />
      {snapshot && 
        <ClearButton onClick={snapshot.clear} />
      }
    </div>
  );
}

function FindAndStop({ use }) {
  const [ data, setData ] = useState();
  const setDataLater = useCallback((data) => {
    if (data) {
      setTimeout(() => setData(data), 500);  
    }
  }, []);
  return (
    <div>
      {!data &&
        <BarcodeScanner boundingBox={bb} cornerPoints={cp} use={use} clearInterval={500} onData={setDataLater}>
          <NoCamera />
        </BarcodeScanner>
      }
      {data &&
        <BarcodeData type="full" data={data} />}
      {data &&
        <ClearButton onClick={() => setData()} />
      }
    </div>
  );
}

function BarcodeData({ data, type }) {
  const classList = [ 'BarcodeData', type ];
  let content;
  try {
    const url = new URL(data);
    content = <a href={url} target="_blank" rel="noreferrer">{data}</a>
  } catch (err) {
    content = data;
  }
  return <div className={classList.join(' ')}>{content}</div>;
}

function ClearButton({ onClick }) {
  return <div className="ClearButton" onClick={onClick}>Clear</div>;
}

function NoCamera() {
  return (
    <div className="no-camera">
      <div className="sign">&#9940;</div>
    </div>  
  );
}
