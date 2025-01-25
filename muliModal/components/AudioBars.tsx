import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef, useState } from 'react';

interface AudioBarsProps {
  isRecording: boolean;
  audioStream?: MediaStream | null;
}

export function AudioBars({ isRecording, audioStream }: AudioBarsProps) {
  const [audioData, setAudioData] = useState<number[]>(Array(20).fill(0));
  const barAnimations = Array(20).fill(0).map(() => useRef(new Animated.Value(1)).current);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording && audioStream) {
      setupAudioAnalyzer(audioStream);
    } else {
      cleanupAudio();
    }

    return () => cleanupAudio();
  }, [isRecording, audioStream]);

  const setupAudioAnalyzer = async (stream: MediaStream) => {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      // Create audio context and analyzer
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;  // Reduced for more dramatic effect
      analyser.smoothingTimeConstant = 0.5;  // Reduced for faster response
      analyser.minDecibels = -70;  // Increased range
      analyser.maxDecibels = -30;
      analyserRef.current = analyser;

      // Connect microphone to analyzer
      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 2.5; // Increased gain

      source.connect(gainNode);
      gainNode.connect(analyser);

      // Start analyzing audio
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateData = () => {
        if (!isRecording || !analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Process frequency data into 10 bars (will be mirrored)
        const halfBars = 10; // We'll mirror this for 20 total bars
        const bars = Array(halfBars).fill(0);
        const binSize = Math.floor(dataArray.length / halfBars);
        
        // Calculate values for half the bars
        for (let i = 0; i < halfBars; i++) {
          let sum = 0;
          const startBin = Math.floor(i * binSize * 0.8);
          const endBin = Math.floor((i + 1) * binSize * 0.8);
          
          for (let j = startBin; j < endBin; j++) {
            // Weight middle frequencies more
            const weight = 1 + (i > 3 && i < 7 ? (5 - Math.abs(5 - i)) * 0.2 : 0);
            sum += dataArray[j] * weight;
          }
          
          // Enhanced normalization and scaling
          const average = sum / (endBin - startBin);
          const normalizedValue = average / 255;
          // More dramatic scaling with exponential curve
          bars[i] = 1 + Math.pow(normalizedValue, 1.2) * 8;  // Increased multiplier and reduced exponent
        }

        // Mirror the bars for symmetry
        const mirroredBars = [
          ...bars.slice(0, halfBars).reverse(),  // Left side
          ...bars.slice(0, halfBars)             // Right side
        ];

        setAudioData(mirroredBars);
        animationFrameRef.current = requestAnimationFrame(updateData);
      };

      animationFrameRef.current = requestAnimationFrame(updateData);
    } catch (error) {
      console.error('Error setting up audio analyzer:', error);
    }
  };

  const cleanupAudio = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioData(Array(20).fill(0));
  };

  // Animate bars based on audio data with more dramatic spring physics
  useEffect(() => {
    audioData.forEach((value, index) => {
      Animated.spring(barAnimations[index], {
        toValue: value,
        tension: 150,  // Increased tension
        friction: 4,   // Reduced friction
        useNativeDriver: false,
      }).start();
    });
  }, [audioData]);

  return (
    <View style={styles.barsContainer}>
      {barAnimations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              transform: [{ 
                scaleY: anim
              }],
              height: 40,  // Increased base height
            }
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 50,  // Added padding to accommodate taller bars
  },
  bar: {
    width: 3,
    backgroundColor: '#81b0ff',
    borderRadius: 2,
  },
}); 