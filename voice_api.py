import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
import soundfile as sf
import resampy
import io
import base64
import tempfile
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os

# Initialize FastAPI app
app = FastAPI(title="SheGuard Voice Recognition API")

# Add CORS middleware
# Configure CORS from environment variable (comma-separated), with sensible defaults
allowed_origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
)
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
YAMNET_MODEL_HANDLE = 'https://tfhub.dev/google/yamnet/1'
TARGET_SAMPLE_RATE = 16000

# Danger classes we want to detect
DANGER_CLASSES = [
    'Screaming',
    'Shout', 
    'Gunshot, gunfire',
    'Crying, sobbing',
    'Alarm',
    'Speech'  # For potential sentiment analysis
]

# Global model variable
yamnet_model = None

class AudioAnalysisRequest(BaseModel):
    audio_data: str  # Base64 encoded audio
    audio_format: str = "webm"  # or "wav"

class AudioAnalysisResponse(BaseModel):
    danger_detected: bool
    confidence: float
    detected_classes: list
    analysis_details: dict
    emergency_level: str

def load_yamnet_model():
    """Load the YAMNet model once at startup"""
    global yamnet_model
    if yamnet_model is None:
        print("Loading YAMNet model...")
        yamnet_model = hub.load(YAMNET_MODEL_HANDLE)
        print("YAMNet model loaded successfully!")
    return yamnet_model

def process_audio_data(audio_data: str, audio_format: str = "webm"):
    """
    Process base64 encoded audio data and convert to YAMNet-compatible format
    """
    try:
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_data)
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix=f".{audio_format}", delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
        
        # Load audio file
        try:
            wav_data, original_sr = sf.read(temp_file_path, dtype=np.int16)
        except Exception as e:
            # If direct reading fails, try with different parameters
            wav_data, original_sr = sf.read(temp_file_path)
        
        # Convert to float32 and normalize
        waveform = wav_data.astype(np.float32) / 32768.0
        
        # Convert to mono if stereo
        if len(waveform.shape) > 1:
            waveform = np.mean(waveform, axis=1)
        
        # Resample if needed
        if original_sr != TARGET_SAMPLE_RATE:
            waveform = resampy.resample(waveform, original_sr, TARGET_SAMPLE_RATE)
        
        # Convert to TensorFlow tensor
        waveform_tensor = tf.constant(waveform, dtype=tf.float32)
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        return waveform_tensor
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing audio: {str(e)}")

def analyze_audio_with_yamnet(waveform_tensor):
    """
    Analyze audio using YAMNet model
    """
    model = load_yamnet_model()
    
    # Run YAMNet inference
    scores, embeddings, spectrogram = model(waveform_tensor)
    
    # Load class names
    class_map_path = model.class_map_path().numpy().decode('utf-8')
    class_names = list(tf.io.gfile.GFile(class_map_path).read().splitlines())
    
    # Calculate mean scores across time patches
    mean_scores = np.mean(scores.numpy(), axis=0)
    
    # Find top predictions
    top_indices = np.argsort(mean_scores)[::-1][:10]  # Top 10 predictions
    
    detected_classes = []
    danger_detected = False
    max_confidence = 0.0
    emergency_level = "low"
    
    for index in top_indices:
        class_name = class_names[index]
        confidence = mean_scores[index]
        
        if class_name in DANGER_CLASSES and confidence > 0.3:
            detected_classes.append({
                "class": class_name,
                "confidence": float(confidence)
            })
            danger_detected = True
            max_confidence = max(max_confidence, confidence)
    
    # Determine emergency level
    if max_confidence > 0.8:
        emergency_level = "critical"
    elif max_confidence > 0.6:
        emergency_level = "high"
    elif max_confidence > 0.4:
        emergency_level = "medium"
    
    return {
        "danger_detected": danger_detected,
        "confidence": float(max_confidence),
        "detected_classes": detected_classes,
        "emergency_level": emergency_level,
        "all_predictions": [
            {"class": class_names[i], "confidence": float(mean_scores[i])} 
            for i in top_indices
        ]
    }

@app.on_event("startup")
async def startup_event():
    """Load the YAMNet model on startup"""
    load_yamnet_model()

@app.get("/")
async def root():
    return {"message": "SheGuard Voice Recognition API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": yamnet_model is not None}

@app.post("/analyze-audio", response_model=AudioAnalysisResponse)
async def analyze_audio(request: AudioAnalysisRequest):
    """
    Analyze audio for danger signals using YAMNet
    """
    try:
        # Process the audio data
        waveform_tensor = process_audio_data(request.audio_data, request.audio_format)
        
        # Analyze with YAMNet
        analysis_result = analyze_audio_with_yamnet(waveform_tensor)
        
        return AudioAnalysisResponse(
            danger_detected=analysis_result["danger_detected"],
            confidence=analysis_result["confidence"],
            detected_classes=analysis_result["detected_classes"],
            analysis_details=analysis_result,
            emergency_level=analysis_result["emergency_level"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/test-audio")
async def test_audio():
    """
    Test endpoint with a simple audio file
    """
    try:
        # Create a simple test audio (sine wave)
        duration = 1.0  # 1 second
        sample_rate = TARGET_SAMPLE_RATE
        t = np.linspace(0, duration, int(sample_rate * duration))
        
        # Generate a simple tone (this won't trigger danger detection)
        frequency = 440  # A4 note
        waveform = np.sin(2 * np.pi * frequency * t)
        waveform_tensor = tf.constant(waveform, dtype=tf.float32)
        
        # Analyze
        analysis_result = analyze_audio_with_yamnet(waveform_tensor)
        
        return {
            "message": "Test completed",
            "result": analysis_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
