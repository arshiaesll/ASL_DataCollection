import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

export type RecordingInterval = '5s' | '10s' | '30s' | '1m' | '∞';

interface RecordingOptionsProps {
  selectedInterval: RecordingInterval;
  onIntervalSelect: (interval: RecordingInterval) => void;
  isRecording: boolean;
}

export function RecordingOptions({ selectedInterval, onIntervalSelect, isRecording }: RecordingOptionsProps) {
  const intervals: RecordingInterval[] = ['5s', '10s', '30s', '1m', '∞'];

  return (
    <View style={styles.container}>
      {intervals.map((interval) => (
        <TouchableOpacity
          key={interval}
          style={[
            styles.option,
            selectedInterval === interval && styles.selectedOption,
            isRecording && styles.disabledOption
          ]}
          onPress={() => !isRecording && onIntervalSelect(interval)}
          disabled={isRecording}
        >
          <Text
            style={[
              styles.optionText,
              selectedInterval === interval && styles.selectedOptionText,
              isRecording && styles.disabledOptionText
            ]}
          >
            {interval}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOption: {
    backgroundColor: '#81b0ff',
    borderColor: '#81b0ff',
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledOptionText: {
    color: '#999',
  },
}); 