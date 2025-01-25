import { StyleSheet, View, Text } from 'react-native';
import { Audio } from 'expo-av';
import { useState, useEffect, useRef } from 'react';
import { AudioBars } from './AudioBars';
import { RecordingInterval } from './RecordingOptions';

interface AudioVisualizerProps {
  recordingInterval: RecordingInterval;
  isRecording: boolean;
  onRecordingComplete: (uri: string, duration: number) => void;
}

export function AudioVisualizer({ recordingInterval, isRecording, onRecordingComplete }: AudioVisualizerProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [status, setStatus] = useState<string>('Ready to record');
  const [hasPermission, setHasPermission] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // Convert interval to milliseconds
  const getRecordingDuration = () => {
    switch (recordingInterval) {
      case '5s': return 5000;
      case '10s': return 10000;
      case '30s': return 30000;
      case '1m': return 60000;
      case '∞': return null;  // Infinite recording
      default: return 5000;  // Default to 5 seconds
    }
  };

  useEffect(() => {
    // Request permissions and setup audio when component mounts
    const setupAudio = async () => {
      try {
        // Request permissions
        const permission = await Audio.requestPermissionsAsync();
        setHasPermission(permission.granted);
        
        if (!permission.granted) {
          setStatus('Microphone permission not granted');
          return;
        }

        // Initialize audio
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false
        });

        // For web, explicitly request and verify microphone access
        if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 2,
                sampleRate: 44100,
                sampleSize: 16,
              }
            });
            
            // Check if we're getting audio input
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
              console.log('Using microphone:', audioTrack.label);
              setStatus(`Microphone ready: ${audioTrack.label}`);
              setAudioStream(stream);
            } else {
              setStatus('No microphone detected');
            }
          } catch (err: any) {
            console.error('Microphone access error:', err);
            setStatus(`Microphone error: ${err.message}`);
          }
        }
      } catch (err: any) {
        console.error('Audio setup error:', err);
        setStatus(`Setup error: ${err.message}`);
      }
    };

    setupAudio();

    // Cleanup function
    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
    };
  }, []);

  // Start recording when isRecording becomes true
  useEffect(() => {
    if (isRecording && !recording) {
      startRecording();
    }
  }, [isRecording]);

  // Handle recording duration
  useEffect(() => {
    if (isRecording && recording) {
      const duration = getRecordingDuration();
      if (duration === null) return; // Don't set a timer for infinite recording

      const timer = setTimeout(async () => {
        if (recording) {
          setStatus('Saving recording...');
          try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            if (uri) {
              onRecordingComplete(uri, duration);
              setStatus(`Recording saved (${duration / 1000}s)`);
            }
          } catch (error) {
            console.error('Recording error:', error);
            setStatus(`Error: ${error}`);
          }
          setRecording(null);
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isRecording, recording, recordingInterval]);

  const startRecording = async () => {
    if (!hasPermission) {
      setStatus('Microphone permission not granted');
      return;
    }

    try {
      setStatus('Starting recording...');

      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 256000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 256000
        },
      });

      setRecording(newRecording);
      setStatus(`Recording (${recordingInterval})`);
    } catch (error) {
      console.error('Start recording error:', error);
      setStatus(`Error: ${error}`);
    }
  };

  return (
    <View style={styles.visualizerContainer}>
      <AudioBars isRecording={isRecording} audioStream={audioStream} />
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  visualizerContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 10,
  },
  status: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    fontSize: 12,
    color: '#4a90e2',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 5,
    borderRadius: 5,
  },
}); 