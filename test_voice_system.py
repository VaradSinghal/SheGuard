#!/usr/bin/env python3
"""
Test script for SheGuard Voice Recognition System
This script tests the Python backend API without requiring the frontend
"""

import requests
import numpy as np
import tempfile
import soundfile as sf
import os
import time

def create_test_audio():
    """Create a test audio file with a simple tone"""
    duration = 2.0  # 2 seconds
    sample_rate = 16000
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Create a simple sine wave (440 Hz - A4 note)
    frequency = 440
    waveform = np.sin(2 * np.pi * frequency * t)
    
    # Add some noise to make it more realistic
    noise = np.random.normal(0, 0.1, len(waveform))
    waveform = waveform + noise
    
    # Save as temporary WAV file
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
        sf.write(temp_file.name, waveform, sample_rate)
        return temp_file.name

def test_api_health():
    """Test if the API is running"""
    try:
        response = requests.get('http://localhost:8000/health', timeout=5)
        if response.status_code == 200:
            print("✅ API Health Check: PASSED")
            return True
        else:
            print(f"❌ API Health Check: FAILED (Status: {response.status_code})")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ API Health Check: FAILED (Connection Error: {e})")
        return False

def test_audio_analysis():
    """Test audio analysis endpoint"""
    try:
        # Create test audio
        print("Creating test audio...")
        audio_file = create_test_audio()
        
        # Read and encode audio
        with open(audio_file, 'rb') as f:
            audio_data = f.read()
        
        import base64
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        # Send to API
        print("Sending audio to API...")
        response = requests.post('http://localhost:8000/analyze-audio', 
                                json={
                                    'audio_data': audio_base64,
                                    'audio_format': 'wav'
                                },
                                timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Audio Analysis: PASSED")
            print(f"   Danger Detected: {result['danger_detected']}")
            print(f"   Confidence: {result['confidence']:.2f}")
            print(f"   Emergency Level: {result['emergency_level']}")
            if result['detected_classes']:
                print("   Detected Classes:")
                for cls in result['detected_classes']:
                    print(f"     - {cls['class']}: {cls['confidence']:.2f}")
            return True
        else:
            print(f"❌ Audio Analysis: FAILED (Status: {response.status_code})")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Audio Analysis: FAILED (Error: {e})")
        return False
    finally:
        # Clean up
        if 'audio_file' in locals():
            os.unlink(audio_file)

def test_synthetic_audio():
    """Test with synthetic audio endpoint"""
    try:
        print("Testing synthetic audio endpoint...")
        response = requests.post('http://localhost:8000/test-audio', timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Synthetic Audio Test: PASSED")
            print(f"   Result: {result.get('message', 'Unknown')}")
            return True
        else:
            print(f"❌ Synthetic Audio Test: FAILED (Status: {response.status_code})")
            return False
            
    except Exception as e:
        print(f"❌ Synthetic Audio Test: FAILED (Error: {e})")
        return False

def main():
    """Run all tests"""
    print("🧪 SheGuard Voice Recognition System Test")
    print("=" * 50)
    
    # Test 1: API Health
    if not test_api_health():
        print("\n❌ API is not running. Please start the backend first:")
        print("   python start_voice_api.py")
        return
    
    print()
    
    # Test 2: Synthetic Audio
    test_synthetic_audio()
    print()
    
    # Test 3: Real Audio Analysis
    test_audio_analysis()
    print()
    
    print("🎉 Test completed!")
    print("\nNext steps:")
    print("1. Start the frontend: npm run dev")
    print("2. Open http://localhost:5173")
    print("3. Test voice detection with real audio")

if __name__ == "__main__":
    main()
