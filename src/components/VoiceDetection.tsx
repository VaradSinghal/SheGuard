import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Activity, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const VoiceDetection = () => {
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [distressDetected, setDistressDetected] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [apiConnected, setApiConnected] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const { toast } = useToast();

  // Helpers: convert recorded WebM/Opus to WAV (mono, 16kHz) and base64-encode
  const floatTo16BitPCM = (input: Float32Array) => {
    const output = new DataView(new ArrayBuffer(input.length * 2));
    let offset = 0;
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return output.buffer;
  };

  const encodeWav = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    const dataBuffer = floatTo16BitPCM(samples);

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataBuffer.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM subchunk size
    view.setUint16(20, 1, true); // audio format = PCM
    view.setUint16(22, 1, true); // channels = 1 (mono)
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * blockAlign)
    view.setUint16(32, 2, true); // block align (numChannels * bytesPerSample)
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataBuffer.byteLength, true);

    new Uint8Array(buffer, 44).set(new Uint8Array(dataBuffer));
    return buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  };

  const webmBlobToWavBase64 = async (blob: Blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const ctx: AudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));

    // convert to mono
    const numSamples = decoded.length;
    const mono = decoded.numberOfChannels > 1 ? (() => {
      const tmp = new Float32Array(numSamples);
      const ch0 = decoded.getChannelData(0);
      const ch1 = decoded.getChannelData(1);
      for (let i = 0; i < numSamples; i++) tmp[i] = (ch0[i] + ch1[i]) / 2;
      return tmp;
    })() : decoded.getChannelData(0);

    // resample to 16kHz using OfflineAudioContext
    const targetRate = 16000;
    const length = Math.ceil(decoded.duration * targetRate);
    const offline = new OfflineAudioContext(1, length, targetRate);
    const buffer = offline.createBuffer(1, decoded.length, decoded.sampleRate);
    buffer.copyToChannel(mono, 0);
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    const resampled = rendered.getChannelData(0);

    const wav = encodeWav(resampled, targetRate);
    return arrayBufferToBase64(wav);
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const audioChunks: Blob[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await analyzeAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
      setDistressDetected(false);
      setAnalysisResults([]);
      updateAudioLevel();

      toast({
        title: "Voice Detection Active",
        description: "Listening for distress signals...",
      });

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to use voice detection.",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsListening(false);
    setAudioLevel(0);
    
    toast({
      title: "Voice Detection Stopped",
      description: "Analysis complete.",
    });
  };

  const updateAudioLevel = () => {
    if (!analyserRef.current || !isListening) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const level = (average / 255) * 100;
    setAudioLevel(level);

    // Only use mock detection if API is not connected
    if (!apiConnected && level > 30 && Math.random() > 0.95) { // Simulate occasional detection
      const screamDetectionValue = 70 + Math.random() * 20; // Random between 70-90%
      setDistressDetected(true);
      setAnalysisResults(prev => [...prev, `🚨 Mock scream detected: ${screamDetectionValue.toFixed(1)}% confidence`]);
      triggerEmergencyAlert(screamDetectionValue);
    }

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const analyzeAudio = async (audioBlob: Blob) => {
    try {
      // Convert recorded WebM/Opus to WAV 16k mono and base64
      const base64Audio = await webmBlobToWavBase64(audioBlob);

      // Call the Python YAMNet API
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/analyze-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_data: base64Audio,
          audio_format: 'wav'
        })
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`API call failed: ${response.status} ${text}`);
      }

      const analysisResult = await response.json();
      
      // Process the analysis results
      const analysisDetails = [
        `Audio analysis complete (${(audioBlob.size / 1000).toFixed(1)}s)`,
        `Emergency level: ${analysisResult.emergency_level.toUpperCase()}`,
        `Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%`
      ];

      if (analysisResult.danger_detected) {
        analysisDetails.push("🚨 DANGER DETECTED!");
        analysisResult.detected_classes.forEach((detected: any) => {
          analysisDetails.push(`- ${detected.class}: ${(detected.confidence * 100).toFixed(1)}%`);
        });
        
        // Trigger emergency alert if danger is detected
        setDistressDetected(true);
        triggerEmergencyAlert(analysisResult.confidence * 100);
      } else {
        analysisDetails.push("No danger signals detected");
      }

      setAnalysisResults(prev => [...prev, ...analysisDetails]);

    } catch (error) {
      console.error('Error analyzing audio:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      setAnalysisResults(prev => [...prev, `Analysis error: ${errMsg}`]);
      toast({
        title: "Analysis Failed",
        description: errMsg,
        variant: "destructive"
      });
    }
  };

  const triggerEmergencyAlert = async (confidence: number) => {
    const alertData = {
      email: userEmail,
      location: "Current Location (Demo)", 
      severity: confidence > 85 ? "critical" : "high",
      timestamp: new Date().toISOString(),
    };

    // Send community alert
    const communityAlert = {
      author: "SheGuard AI",
      message: `🚨 Emergency detected! Scream detected with ${confidence.toFixed(1)}% confidence`,
      urgency: confidence > 85 ? "critical" : "high",
      location: "Current Location (Demo)",
      timestamp: new Date(),
    };

    // Store in community alerts (using window event for demo)
    window.dispatchEvent(new CustomEvent('new-alert', { detail: communityAlert }));

    // Send email notification
    try {
      await supabase.functions.invoke('send-alert-email', {
        body: alertData
      });
      
      toast({
        title: "🚨 Emergency Alert Sent!",
        description: "Community notified and emergency email sent.",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error sending alert:', error);
      toast({
        title: "🚨 Alert Sent to Community",
        description: "Community has been notified of the emergency.",
        variant: "destructive",
      });
    }
  };

  const triggerAlert = () => {
    triggerEmergencyAlert(85); // Manual trigger with high confidence
  };

  // Check API connection on component mount
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiBase}/health`);
        if (response.ok) {
          setApiConnected(true);
          toast({
            title: "AI Backend Connected",
            description: "YAMNet model is ready for real-time analysis.",
          });
        }
      } catch (error) {
        setApiConnected(false);
        console.log("API not available, using mock detection");
      }
    };

    checkApiConnection();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [toast]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Voice Detection System
          </CardTitle>
          <CardDescription>
            AI-powered detection of distress signals and emergency situations
          </CardDescription>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-muted-foreground">
              {apiConnected ? 'YAMNet AI Connected' : 'Mock Mode (Start Python backend)'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Demo Email Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Alert Email (Demo)</label>
            <Input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter your email for alerts"
            />
          </div>

          {/* Main Controls */}
          <div className="flex justify-center">
            <Button
              onClick={isListening ? stopListening : startListening}
              size="lg"
              className={`w-32 h-32 rounded-full ${
                isListening 
                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' 
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              {isListening ? (
                <MicOff className="h-12 w-12" />
              ) : (
                <Mic className="h-12 w-12" />
              )}
            </Button>
          </div>

          {/* Audio Level Indicator */}
          {isListening && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Audio Level</span>
                <span>{audioLevel.toFixed(1)}%</span>
              </div>
              <Progress 
                value={audioLevel} 
                className={`h-3 ${audioLevel > 70 ? 'bg-destructive/20' : 'bg-muted'}`}
              />
              <p className="text-xs text-muted-foreground text-center">
                Prototype: Scream detection randomly triggers between 70-90% confidence
              </p>
            </div>
          )}

          {/* Distress Detection Alert */}
          {distressDetected && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-8 w-8 text-destructive animate-pulse" />
                  <div>
                    <h3 className="font-semibold text-destructive">Distress Signal Detected</h3>
                    <p className="text-sm text-muted-foreground">AI has identified potential emergency</p>
                  </div>
                </div>
                <Button 
                  onClick={triggerAlert}
                  variant="destructive"
                  className="w-full bg-destructive hover:bg-destructive/90"
                >
                  Send Manual Emergency Alert
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {analysisResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {analysisResults.map((result, index) => (
                    <div key={index} className="text-sm p-2 bg-muted rounded">
                      {result}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-2">How to Use:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>Start Python Backend:</strong> Run <code>python start_voice_api.py</code></li>
                <li>• Click the microphone to start listening</li>
                <li>• YAMNet AI analyzes audio for danger signals (screaming, shouting, etc.)</li>
                <li>• Automatic community alerts when distress detected</li>
                <li>• Email notifications sent to registered email</li>
                <li>• Real-time AI analysis with confidence scores</li>
              </ul>
              {!apiConnected && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Start the Python backend for real AI analysis. 
                    Currently running in mock mode.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceDetection;