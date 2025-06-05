import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

export default function App() {
  const [eyeTime, setEyeTime] = useState('');
  const [faceTime, setFaceTime] = useState('');
  const [response, setResponse] = useState(null);
  // const [showCamera, setShowCamera] = useState(true);
  const [showBoxes, setShowBoxes] = useState(false);
  const [warning, setWarning] = useState(null);
  const [inputError, setInputError] = useState('');
  const [showStream, setShowStream] = useState(true);
  const [audioFile, setAudioFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const socket = io('http://localhost:5000');
    
    socket.on('warning', (data) => {
      setWarning(data.message);
    });

    socket.on('eyes_detected', (data) => {
      setWarning(null);
    });

    socket.on('face_warning', (data) => {
      setWarning(data.message);
    });

    socket.on('face_detected', (data) => {
      setWarning(null);
    });

    socket.on('play_audio', (data) => {
      if (data.file_path) {
        audioRef.current.src = data.file_path;
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
        });
      }
    });

    return () => {
      socket.disconnect();
      audioRef.current.pause();
    };
  }, []);

  const handleEyeTimeChange = (e) => {
    const value = e.target.value;
    // Only allow digits
    if (value === '' || /^\d+$/.test(value)) {
      setEyeTime(value);
      setInputError('');
    }
  };

  const handleEyeTimeSubmit = async (e) => {
    e.preventDefault();
    if (!eyeTime) {
      setInputError('Please enter a number');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/take_input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: parseInt(eyeTime) }),
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({ error: 'Failed to send input' });
    }
  };

  const handleFaceTimeChange = (e) => {
    const value = e.target.value;
    // Only allow digits
    if (value === '' || /^\d+$/.test(value)) {
      setFaceTime(value);
      setInputError('');
    }
  };

  const handleFaceTimeSubmit = async (e) => {
    e.preventDefault();
    if (!faceTime) {
      setInputError('Please enter a number');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/set_face_time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: parseInt(faceTime) }),
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({ error: 'Failed to send input' });
    }
  };

  const toggleBoxes = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/show_boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showBoxes: !showBoxes })
      });
      const data = await res.json();
      setResponse(data);
      setShowBoxes(!showBoxes);
    } catch (err) {
      setResponse({ error: 'Failed to toggle boxes' });
    }
  }

  const toggleStream = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/toggle_stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showStream: !showStream })
    });
      const data = await res.json();
      setResponse(data);
      setShowStream(!showStream);
    } catch (err) {
      setResponse({ error: 'Failed to toggle stream' });
    }
  }

  const handleAudioFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log(file.type);
      if (file.type === 'audio/mpeg' || file.type === 'audio/wav') {
        setAudioFile(file);
        setUploadStatus('');
      } else {
        setUploadStatus('Please select an MP3 or WAV file');
        setAudioFile(null);
      }
    }
  };

  const handleAudioUpload = async (e) => {
    e.preventDefault();
    if (!audioFile) {
      setUploadStatus('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', audioFile);

    try {
      const res = await fetch('http://localhost:5000/upload_audio', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setUploadStatus(data.message);
      setResponse(data);
    } catch (err) {
      setUploadStatus('Failed to upload audio file');
      setResponse({ error: 'Failed to upload audio file' });
    }
  };

  return (
    <div>
      <h1></h1>
      <p>Welcome to your Electron application.</p>
      <button onClick={toggleStream}>
        {showStream ? 'Stop Stream' : 'Start Stream'}
      </button>
      {/* <button onClick={() => setShowCamera(!showCamera)}>
        {showCamera ? 'Hide Camera' : 'Show Camera'}
      </button> */}
      <button onClick={toggleBoxes}>{showBoxes ? "Hide Boxes" : "Show Boxes"}</button>
      {warning && (
        <div style={{ 
          backgroundColor: 'red', 
          color: 'white', 
          padding: '10px', 
          margin: '10px 0',
          borderRadius: '5px'
        }}>
          {warning}
        </div>
      )}
      <img
        id="eye-feed"
        src={ showStream ? "http://localhost:5000" : "assets/camera-off.svg"}
        alt="Eye Feed"
        width={640}
        height={480}
        style={{ maxWidth: '100%' }} />
      <form className="time" onSubmit={handleEyeTimeSubmit}>
        <label htmlFor="input-text">Set Eye Timer (seconds)</label>
        <input
          type="text"
          id="input-text"
          name="input-text"
          value={eyeTime}
          onChange={handleEyeTimeChange}
          placeholder="Enter number of seconds"
        />
        {inputError && (
          <div style={{ color: 'red', fontSize: '0.8em', marginTop: '5px' }}>
            {inputError}
          </div>
        )}
        <button type="submit">Submit</button>
      </form>
      <form className="time" onSubmit={handleFaceTimeSubmit}>
        <label htmlFor="input-text">Set Face Timer (seconds)</label>
        <input
          type="text"
          id="input-text"
          name="input-text"
          value={faceTime}
          onChange={handleFaceTimeChange}
          placeholder="Enter number of seconds"
        />
        {inputError && (
          <div style={{ color: 'red', fontSize: '0.8em', marginTop: '5px' }}>
            {inputError}
          </div>
        )}
        <button type="submit">Submit</button>
      </form>
      <form className="audio-upload" onSubmit={handleAudioUpload}>
        <label htmlFor="audio-file">Upload Warning Sound (MP3 or WAV)</label>
        <input
          type="file"
          id="audio-file"
          name="audio-file"
          accept=".mp3,.wav"
          onChange={handleAudioFileChange}
        />
        {uploadStatus && (
          <div style={{ 
            color: uploadStatus.includes('success') ? 'green' : 'red', 
            fontSize: '0.8em', 
            marginTop: '5px' 
          }}>
            {uploadStatus}
          </div>
        )}
        <button type="submit">Upload Audio</button>
      </form>
      {response && (
        <pre>{JSON.stringify(response, null, 2)}</pre>
      )}
    </div>
  );
}