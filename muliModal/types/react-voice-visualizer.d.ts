declare module 'react-voice-visualizer' {
  import { ComponentType } from 'react';

  interface VoiceVisualizerProps {
    colors?: string[];
    height?: number;
    style?: any;
  }

  export const VoiceVisualizer: ComponentType<VoiceVisualizerProps>;
} 