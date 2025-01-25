import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface VideoPlayerProps {
  uri?: string;
  base64Data?: string;
  mimeType: string;
  signName: string;
}

export function VideoPlayer({ uri, base64Data, mimeType, signName }: VideoPlayerProps) {
  const videoSrc = base64Data ? `data:${mimeType};base64,${base64Data}` : uri;

  return (
    <View style={styles.container}>
      <video
        src={videoSrc}
        controls
        autoPlay
        loop
        muted={signName === "Preview"}
        style={styles.video}
      />
      {signName && (
        <Text style={styles.signName}>{signName}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  signName: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: 5,
    borderRadius: 5,
    fontSize: 14,
  },
}); 