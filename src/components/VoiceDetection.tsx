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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const { toast } = useToast();

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

    // Hardcoded scream detection between 70-90% for prototype
    if (level > 30 && Math.random() > 0.85) { // Simulate occasional detection
      const screamDetectionValue = 70 + Math.random() * 20; // Random between 70-90%
      setDistressDetected(true);
      setAnalysisResults(prev => [...prev, `🚨 Scream detected: ${screamDetectionValue.toFixed(1)}% confidence`]);
      triggerEmergencyAlert(screamDetectionValue);
    }

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const analyzeAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64 for API call
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // In a real implementation, you would call an AI service here
      // For demo purposes, we'll simulate analysis
      const mockAnalysis = [
        "Audio analysis complete",
        `Duration: ${(audioBlob.size / 1000).toFixed(1)}s`,
        "Voice pattern: Normal conversation",
        "Distress level: Low"
      ];

      setAnalysisResults(prev => [...prev, ...mockAnalysis]);

    } catch (error) {
      console.error('Error analyzing audio:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the audio recording.",
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

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
              <h4 className="font-semibold mb-2">Prototype Features:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Click the microphone to start listening</li>
                <li>• Scream detection simulated between 70-90% confidence</li>
                <li>• Automatic community alerts when distress detected</li>
                <li>• Email notifications sent to registered email</li>
                <li>• Location shared with nearby community members</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceDetection;