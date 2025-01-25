import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { RecordingInterval } from './RecordingOptions';

export type VideoQuality = '2160p' | '1080p' | '720p' | '480p' | '360p';
export type FileType = 'mp4' | 'mov' | 'webm';

// Quality settings mapping
const QUALITY_CONSTRAINTS = {
  '2160p': { width: 3840, height: 2160 },
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
  '360p': { width: 640, height: 360 },
};

interface VideoRecorderProps {
  recordingInterval: RecordingInterval;
  isRecording: boolean;
  onRecordingComplete: (uri: string, duration: number) => void;
  quality: VideoQuality;
  fileType: FileType;
}

export function VideoRecorder({ 
  recordingInterval, 
  isRecording: parentIsRecording, 
  onRecordingComplete,
  quality,
  fileType,
}: VideoRecorderProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startWebRecording = async () => {
    if (!cameraRef.current) return;
    
    try {
      console.log('Starting web recording with quality:', quality);
      const constraints = QUALITY_CONSTRAINTS[quality];
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: constraints.width },
          height: { ideal: constraints.height }
        },
        audio: true
      });

      // Set video bitrate based on quality
      const bitrate = constraints.width * constraints.height * 0.2; // rough estimate for good quality

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: `video/${fileType}`,
        videoBitsPerSecond: bitrate
      });
      
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: `video/${fileType}` });
        const url = URL.createObjectURL(blob);
        onRecordingComplete(url, 0);
      };

      const duration = recordingInterval === '∞' ? undefined : parseInt(recordingInterval) * 1000;
      mediaRecorderRef.current.start();

      if (duration) {
        setTimeout(() => {
          stopWebRecording();
        }, duration);
      }
    } catch (error) {
      console.error('Error starting web recording:', error);
    }
  };

  const stopWebRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      const tracks = mediaRecorderRef.current.stream.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const startNativeRecording = async () => {
    if (cameraRef.current) {
      try {
        console.log('Starting native recording with quality:', quality);
        const video = await cameraRef.current.recordAsync({
          maxDuration: recordingInterval === '∞' ? undefined : parseInt(recordingInterval),
          quality: quality.toLowerCase(), // expo-camera expects lowercase quality values
          fileType: fileType.toUpperCase(),
        });
        
        await MediaLibrary.saveToLibraryAsync(video.uri);
        onRecordingComplete(video.uri, video.duration || 0);
      } catch (error) {
        console.error('Error recording video:', error);
      }
    }
  };

  const stopNativeRecording = async () => {
    if (cameraRef.current) {
      try {
        await cameraRef.current.stopRecording();
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }
  };

  useEffect(() => {
    if (parentIsRecording) {
      if (Platform.OS === 'web') {
        startWebRecording();
      } else {
        startNativeRecording();
      }
    } else {
      if (Platform.OS === 'web') {
        stopWebRecording();
      } else {
        stopNativeRecording();
      }
    }
  }, [parentIsRecording]);

  if (!permission) {
    return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={cameraRef}
      >
        <View style={styles.overlay} />
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
}); 