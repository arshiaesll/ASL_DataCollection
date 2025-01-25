import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface AccelerationData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface Props {
  data: AccelerationData[];
}

export const AccelerationVisualizer: React.FC<Props> = ({ data }) => {
  const [latestData, setLatestData] = useState<AccelerationData | null>(null);

  useEffect(() => {
    if (data.length > 0) {
      setLatestData(data[data.length - 1]);
    }
  }, [data]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acceleration Data</Text>
      {latestData ? (
        <View style={styles.dataContainer}>
          <View style={styles.row}>
            <Text style={styles.label}>X:</Text>
            <Text style={styles.value}>{latestData.x.toFixed(2)} m/s²</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Y:</Text>
            <Text style={styles.value}>{latestData.y.toFixed(2)} m/s²</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Z:</Text>
            <Text style={styles.value}>{latestData.z.toFixed(2)} m/s²</Text>
          </View>
          <Text style={styles.timestamp}>
            Last updated: {new Date(latestData.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      ) : (
        <Text style={styles.noData}>No data available</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  dataContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  value: {
    fontSize: 16,
    color: '#007AFF',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'right',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
}); 