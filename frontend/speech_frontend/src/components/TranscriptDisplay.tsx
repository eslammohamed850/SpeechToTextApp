import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Mic, MicOff, Download } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

interface Transcript {
  type: 'partial_transcript' | 'final_transcript';
  text: string;
  sentiment?: string;
  sentiment_score?: number;
  session_id: string;
  timestamp?: string;
}

const TranscriptDisplay: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [partialTranscript, setPartialTranscript] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const websocketRef = useRef<WebSocket | null>(null);
  // const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Removed unused ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, partialTranscript]);

  const connectWebSocket = () => {
    setConnectionStatus('connecting');
    
    // Create WebSocket connection to backend
    // For GitHub/Netlify deployment: automatically detect the backend URL
    // If deployed to Netlify, the backend should be deployed separately (e.g., to Render/Railway)
    // For local development, it will connect to localhost:8000
    let backendUrl;
    
    // Production deployment: check if we're on Netlify and use environment variable
    if (import.meta.env.VITE_BACKEND_URL) {
      backendUrl = import.meta.env.VITE_BACKEND_URL;
    } 
    // Local development
    else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      backendUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    // Fallback to the temporary sandbox URL (will be replaced in production)
    else {
      backendUrl = 'https://8000-ix25znd9yo61gqc1xikqe-6f06528a.manusvm.computer';
    }
    
    const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${backendUrl.replace('https://', '').replace('http://', '')}/ws/transcribe?session_id=${Date.now()}`;
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      setConnectionStatus('connected');
      setError(null);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'partial_transcript') {
        setPartialTranscript(data.text);
      } else if (data.type === 'final_transcript') {
        // Add timestamp for display
        const timestamp = new Date().toLocaleTimeString();
        setTranscripts(prev => [...prev, {...data, timestamp}]);
        setPartialTranscript('');
      } else if (data.type === 'error') {
        setError(data.message);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection error. Please try again.');
      setConnectionStatus('disconnected');
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setConnectionStatus('disconnected');
    };
    
    websocketRef.current = ws;
  };

  const startRecording = async () => {
    try {
      // Connect WebSocket first
      connectWebSocket();
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Set up audio processing
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      // Connect the nodes
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      // Process audio data
      processor.onaudioprocess = (e) => {
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          // Convert audio data to format expected by backend
          const inputData = e.inputBuffer.getChannelData(0);
          const downsampledBuffer = downsampleBuffer(inputData, 44100, 16000);
          const wav = convertToWav(downsampledBuffer, 16000);
          
          // Send audio data to WebSocket
          websocketRef.current.send(wav);
        }
      };
      
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Close WebSocket
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    setIsRecording(false);
    setConnectionStatus('disconnected');
  };

  // Helper function to downsample audio buffer
  const downsampleBuffer = (buffer: Float32Array, sampleRate: number, outSampleRate: number): Float32Array => {
    if (outSampleRate === sampleRate) {
      return buffer;
    }
    
    const sampleRateRatio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    
    let offsetResult = 0;
    let offsetBuffer = 0;
    
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0, count = 0;
      
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    
    return result;
  };

  // Helper function to convert Float32Array to WAV format
  const convertToWav = (buffer: Float32Array, sampleRate: number): Blob => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    
    // Convert float to 16-bit PCM
    const samples = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const dataSize = samples.length * bytesPerSample;
    const buffer1 = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer1);
    
    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Write PCM samples
    const offset = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset + i * bytesPerSample, samples[i], true);
    }
    
    return new Blob([buffer1], { type: 'audio/wav' });
  };

  // Helper function to write string to DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Export transcripts as SRT file (extra feature)
  const exportToSRT = () => {
    if (transcripts.length === 0) return;
    
    let srtContent = '';
    let counter = 1;
    
    transcripts.forEach((transcript, index) => {
      if (transcript.type === 'final_transcript' && transcript.text) {
        // Create fake timestamps for SRT format (just for demonstration)
        const startTime = formatSRTTime(index * 5); // 5 seconds per transcript
        const endTime = formatSRTTime(index * 5 + 4.9);
        
        srtContent += `${counter}\n`;
        srtContent += `${startTime} --> ${endTime}\n`;
        srtContent += `${transcript.text}`;
        
        // Add sentiment as subtitle note if available
        if (transcript.sentiment) {
          srtContent += ` [${transcript.sentiment}]`;
        }
        
        srtContent += '\n\n';
        counter++;
      }
    });
    
    // Create and download the SRT file
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format time for SRT file (HH:MM:SS,mmm)
  const formatSRTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
  };

  // Get sentiment badge color based on sentiment value
  const getSentimentColor = (sentiment: string | undefined): string => {
    if (!sentiment) return 'bg-gray-200 text-gray-800';
    
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'neutral':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Live Speech Transcription</span>
            <div className="flex items-center gap-2">
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'outline'}>
                {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </Badge>
              <Button 
                variant={isRecording ? "destructive" : "default"}
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? <><MicOff className="mr-2 h-4 w-4" /> Stop</> : <><Mic className="mr-2 h-4 w-4" /> Start</>}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Click "Start" to begin recording and transcribing your speech in real-time with sentiment analysis.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="bg-gray-50 rounded-md p-4 h-96 overflow-y-auto mb-4">
            {transcripts.length === 0 && !partialTranscript && !isRecording ? (
              <div className="text-center text-gray-500 h-full flex flex-col justify-center">
                <p>No transcripts yet. Start recording to see transcriptions here.</p>
              </div>
            ) : (
              <>
                {transcripts.map((transcript, index) => (
                  <div key={index} className="mb-4">
                    <div className="flex justify-between items-start">
                      <p className="text-sm text-gray-500">{transcript.timestamp}</p>
                      {transcript.sentiment && (
                        <Badge className={getSentimentColor(transcript.sentiment)}>
                          {transcript.sentiment} {transcript.sentiment_score ? `(${transcript.sentiment_score.toFixed(2)})` : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg">{transcript.text}</p>
                  </div>
                ))}
                
                {partialTranscript && (
                  <div className="mb-4">
                    <div className="flex justify-between items-start">
                      <p className="text-sm text-gray-500">Transcribing...</p>
                    </div>
                    <p className="text-lg text-gray-600">{partialTranscript}</p>
                  </div>
                )}
                
                {isRecording && !partialTranscript && (
                  <div className="flex gap-2 items-center">
                    <Skeleton className="h-4 w-4 rounded-full bg-gray-300 animate-pulse" />
                    <Skeleton className="h-4 w-4 rounded-full bg-gray-300 animate-pulse" />
                    <Skeleton className="h-4 w-4 rounded-full bg-gray-300 animate-pulse" />
                  </div>
                )}
                
                <div ref={transcriptEndRef} />
              </>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {transcripts.length} transcript{transcripts.length !== 1 ? 's' : ''} recorded
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToSRT}
            disabled={transcripts.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> Export as SRT
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TranscriptDisplay;
