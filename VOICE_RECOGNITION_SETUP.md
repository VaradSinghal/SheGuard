# SheGuard Voice Recognition System

This system uses the YAMNet pre-trained AI model to detect danger signals in audio, specifically designed for women's safety applications.

## Features

- **Real-time Voice Analysis**: Uses YAMNet (TensorFlow Hub) for audio classification
- **Danger Detection**: Identifies screaming, shouting, gunshots, crying, and alarm sounds
- **Emergency Alerts**: Automatic community notifications and email alerts
- **Confidence Scoring**: Provides confidence levels for detected events
- **Web Interface**: React-based frontend with real-time audio visualization

## System Architecture

```
Frontend (React) → Python API (FastAPI) → YAMNet Model → Analysis Results
```

## Setup Instructions

### 1. Install Python Dependencies

```bash
# Install required Python packages
pip install -r requirements.txt
```

### 2. Start the Python Backend (local)

```bash
# Option 1: Use the startup script (recommended)
python start_voice_api.py

# Option 2: Run directly
python voice_api.py
```

The API will be available at `http://localhost:8000`

#### Deploy backend (Render)

1. Commit and push your repo to GitHub
2. In Render, create a new Web Service from this repo
3. Use Docker deploy, Render will read `Dockerfile`
4. Set environment variable `ALLOWED_ORIGINS` to your frontend URL(s)
5. After deploy, copy the public URL (e.g., `https://sheguard-voice.onrender.com`)

### 3. Start the Frontend (local)

```bash
# Install Node.js dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

#### Deploy frontend (Vercel/Netlify)

1. Create a project in Vercel or Netlify connected to this repo
2. Set environment variable `VITE_API_URL` to your backend URL
3. Deploy. The app will call `${VITE_API_URL}/analyze-audio` and `/health`

## API Endpoints

- `GET /` - API status
- `GET /health` - Health check
- `POST /analyze-audio` - Analyze audio for danger signals
- `POST /test-audio` - Test endpoint with synthetic audio

## Audio Analysis Process

1. **Audio Capture**: Frontend captures audio using WebRTC
2. **Format Conversion**: WebM audio is converted to base64
3. **API Call**: Audio data sent to Python backend
4. **YAMNet Processing**: Audio analyzed using pre-trained model
5. **Danger Detection**: Model identifies danger-related audio classes
6. **Alert System**: Emergency alerts triggered based on confidence levels

## YAMNet Model Details

- **Model**: YAMNet (Yet Another Mobile Network for Audio Classification)
- **Classes**: 521 audio event classes from AudioSet
- **Input**: 16kHz mono audio
- **Output**: Confidence scores for each class

### Danger Classes Detected

- Screaming
- Shout
- Gunshot, gunfire
- Crying, sobbing
- Alarm
- Speech (for potential sentiment analysis)

## Configuration

### Confidence Thresholds

- **Critical**: > 80% confidence
- **High**: 60-80% confidence  
- **Medium**: 40-60% confidence
- **Low**: < 40% confidence

### Audio Processing

- **Sample Rate**: 16kHz (required by YAMNet)
- **Format**: Mono audio
- **Duration**: Variable (model processes in patches)

## Testing the System

### 1. Test with Real Audio

1. Start both backend and frontend
2. Click the microphone button
3. Record audio containing danger signals (screaming, shouting)
4. Review analysis results

### 2. Test API Directly

```bash
# Test the API health
curl http://localhost:8000/health

# Test with synthetic audio
curl -X POST http://localhost:8000/test-audio
```

## Troubleshooting

### Common Issues

1. **"API not available" message**
   - Ensure Python backend is running on port 8000
   - Check firewall settings
   - Verify all dependencies are installed

2. **Audio analysis fails**
   - Check audio format compatibility
   - Ensure microphone permissions are granted
   - Verify YAMNet model downloads correctly

3. **High CPU usage**
   - YAMNet model is computationally intensive
   - Consider using GPU acceleration if available
   - Reduce audio chunk sizes for real-time processing

### Performance Optimization

1. **Use GPU acceleration** (if available):
   ```python
   # Add to voice_api.py
   import tensorflow as tf
   tf.config.experimental.set_memory_growth(tf.config.list_physical_devices('GPU')[0], True)
   ```

2. **Optimize audio processing**:
   - Reduce audio chunk duration
   - Use lower sample rates for faster processing
   - Implement audio buffering for continuous analysis

## Security Considerations

- Audio data is processed locally (not sent to external services)
- Temporary files are automatically cleaned up
- No persistent storage of audio recordings
- API includes CORS protection

## Development Notes

- The system uses mock detection when API is unavailable
- Real-time analysis requires both frontend and backend running
- YAMNet model is downloaded on first run (~50MB)
- Audio processing includes automatic resampling and format conversion

## Future Enhancements

- Real-time streaming analysis
- Custom model training for specific danger signals
- Integration with emergency services APIs
- Mobile app development
- Offline processing capabilities
