import { StyleSheet, View, Text, Switch, Pressable, TouchableOpacity, Platform, TextInput, Animated } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { useState, useEffect, useRef } from 'react';
import { VideoRecorder, VideoQuality, FileType } from '../../components/VideoRecorder';
import { RecordingOptions, RecordingInterval } from '../../components/RecordingOptions';
import { VideoPlayer } from '../../components/VideoPlayer';
import io from 'socket.io-client';
import { router } from 'expo-router';

const SIGN_WORDS = [
  'garbage',
];

export default function HomePage() {
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [key, setKey] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<RecordingInterval>('∞');
  const [permission, requestPermission] = useCameraPermissions();
  const [showSettings, setShowSettings] = useState(false);
  const [quality, setQuality] = useState<VideoQuality>('720p');
  const [fileType, setFileType] = useState<FileType>(Platform.OS === 'web' ? 'webm' : 'mp4');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [maxDuration, setMaxDuration] = useState<number | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const [videoMimeType, setVideoMimeType] = useState<string>('video/mp4');
  const [currentSignName, setCurrentSignName] = useState<string>('');
  const [username, setUsername] = useState('');
  const [signLabel, setSignLabel] = useState('');
  const [tempRecordedVideo, setTempRecordedVideo] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [searchStatus, setSearchStatus] = useState<{message: string, status: 'none' | 'success' | 'error'}>({
    message: '',
    status: 'none'
  });
  const [userCount, setUserCount] = useState(0);
  const countAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        const status = await requestPermission();
      }
    })();
  }, [permission, requestPermission]);

  useEffect(() => {
    // Check if user is signed in and listen for changes
    const handleStorageChange = async () => {
      const currentUsername = localStorage.getItem('username');
      if (!currentUsername) {
        // Use setTimeout to ensure navigation happens after layout mount
        setTimeout(() => {
          router.replace('/sign-in');
        }, 0);
      } else {
        setUsername(currentUsername);
        // Fetch user count
        try {
          const response = await fetch('http://localhost:3000/user-counts');
          const data = await response.json();
          if (data.status === 'success') {
            const userInfo = data.users.find((u: any) => u.username === currentUsername);
            setUserCount(userInfo?.count || 0);
          }
        } catch (error) {
          console.error('Error fetching user count:', error);
        }
      }
    };

    // Initial check
    handleStorageChange();

    // Listen for changes
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      // Set max duration based on recordingInterval
      const max = recordingInterval === '∞' ? null : 
        recordingInterval.endsWith('m') ? 
          parseInt(recordingInterval) * 60 : 
          parseInt(recordingInterval);
      
      setMaxDuration(max);
      setElapsedTime(0);
      
      interval = setInterval(() => {
        setElapsedTime(prev => {
          if (max && prev >= max) {
            clearInterval(interval);
            setIsRecording(false); // Stop recording when max duration is reached
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setElapsedTime(0);
      setMaxDuration(null);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, recordingInterval]);

  useEffect(() => {
    // Get a random word on component mount
    const randomWord = SIGN_WORDS[Math.floor(Math.random() * SIGN_WORDS.length)];
    handleWordSelect(randomWord);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleCamera = (value: boolean) => {
    if (permission?.granted) {
      setIsCameraEnabled(value);
    } else {
      alert('Camera permission not granted');
    }
  };

  const handleIntervalSelect = (interval: RecordingInterval) => {
    setRecordingInterval(interval);
  };

  const handleRecordingComplete = async (uri: string, duration: number) => {
    setIsRecording(false);
    setTempRecordedVideo(uri);
    setIsReviewing(true);
  };

  const handleSave = async () => {
    if (tempRecordedVideo) {
      await handleVideoRecordingComplete(tempRecordedVideo, 0);
      setTempRecordedVideo(null);
      setIsReviewing(false);
    }
  };

  const handleDiscard = () => {
    setTempRecordedVideo(null);
    setIsReviewing(false);
  };

  const toggleRecording = () => {
    if (!isCameraEnabled) {
      alert('Please enable camera first');
      return;
    }
    setIsRecording(!isRecording);
  };

  const handleSignOut = () => {
    localStorage.removeItem('username');
    setUsername('');
    router.replace('/sign-in');
  };

  const handleWordSelect = async (word: string) => {
    setSignLabel(word);
    
    // Trigger search immediately after selecting the word
    try {
      setSearchStatus({
        message: 'Searching...',
        status: 'none'
      });
      setVideoBase64(null);
      setVideoUri(null);

      const response = await fetch('http://localhost:3000/search-sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: word }),
      });

      const data = await response.json();
      
      if (data.status === 'success' && data.videoData) {
        console.log('Received video data, length:', data.videoData.length);
        setVideoBase64(data.videoData);
        setVideoMimeType(data.mimeType || 'video/mp4');
        setCurrentSignName(word);
      } else {
        setSearchStatus({
          message: data.message,
          status: 'error'
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchStatus({
        message: 'Error processing video data',
        status: 'error'
      });
    }
  };

  const handleVideoRecordingComplete = async (uri: string, duration: number) => {
    try {
      if (!username.trim() || !signLabel.trim()) {
        setSearchStatus({
          message: 'Please enter both username and sign label',
          status: 'error'
        });
        return;
      }

      const response = await fetch(uri);
      const blob = await response.blob();
      console.log('Video recording size:', blob.size, 'bytes');
      console.log('Video recording type:', blob.type);
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        
        const uploadResponse = await fetch('http://localhost:3000/upload-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_data: base64data,
            username: username.trim(),
            label: signLabel.trim(),
            mime_type: blob.type
          }),
        });

        const result = await uploadResponse.json();
        if (result.status === 'success') {
          setSearchStatus({
            message: `Video uploaded successfully at ${new Date().toLocaleTimeString()}`,
            status: 'success'
          });
          setUserCount(prev => prev + 1);
          animateCount();
          // Select a new random word after successful upload
          const randomWord = SIGN_WORDS[Math.floor(Math.random() * SIGN_WORDS.length)];
          handleWordSelect(randomWord);
        } else {
          setSearchStatus({
            message: 'Failed to upload video: ' + result.message,
            status: 'error'
          });
        }
      };
    } catch (error) {
      console.error('Error uploading video recording:', error);
      setSearchStatus({
        message: 'Error uploading video',
        status: 'error'
      });
    }
  };

  const animateCount = () => {
    countAnimation.setValue(1);
    Animated.sequence([
      Animated.spring(countAnimation, {
        toValue: 2.2,
        friction: 4,
        tension: 20,
        useNativeDriver: true,
      }),
      Animated.spring(countAnimation, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const SettingsOverlay = () => (
    <View style={[styles.settingsOverlay, !showSettings && styles.hidden]}>
      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>Recording Duration:</Text>
        <View style={styles.optionsRow}>
          {(['5s', '10s', '30s', '1m', '∞'] as RecordingInterval[]).map((interval) => (
            <TouchableOpacity
              key={interval}
              style={[styles.option, recordingInterval === interval && styles.selectedOption]}
              onPress={() => setRecordingInterval(interval)}
              disabled={isRecording}
            >
              <Text style={[styles.optionText, recordingInterval === interval && styles.selectedOptionText]}>
                {interval}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>Video Quality:</Text>
        <View style={styles.optionsRow}>
          {(['2160p', '1080p', '720p', '480p', '360p'] as VideoQuality[]).map((q) => (
            <TouchableOpacity
              key={q}
              style={[styles.option, quality === q && styles.selectedOption]}
              onPress={() => setQuality(q)}
              disabled={isRecording}
            >
              <Text style={[styles.optionText, quality === q && styles.selectedOptionText]}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>File Type:</Text>
        <View style={styles.optionsRow}>
          {(Platform.OS === 'web' ? ['webm'] : ['mp4', 'mov']).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.option, fileType === type && styles.selectedOption]}
              onPress={() => setFileType(type as FileType)}
              disabled={isRecording}
            >
              <Text style={[styles.optionText, fileType === type && styles.selectedOptionText]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const CountdownOverlay = () => {
    if (!isRecording) return null;

    const timeDisplay = formatTime(elapsedTime);
    const remainingDisplay = maxDuration ? 
      ` / ${formatTime(maxDuration)}` : 
      ' / ∞';

    return (
      <View style={styles.countdownOverlay}>
        <View style={styles.countdownContent}>
          <Text style={styles.recordingIndicator}>🔴 Recording</Text>
          <Text style={styles.countdownText}>
            {timeDisplay}{remainingDisplay}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => setShowSettings(!showSettings)}
          disabled={isRecording}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
        <Text style={styles.title}>MuliModal Recorder</Text>
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <Text style={styles.usernameText}>{username}</Text>
            <Animated.Text 
              style={[
                styles.userCountText,
                { 
                  transform: [
                    { scale: countAnimation },
                    { translateX: Animated.multiply(countAnimation, -10) }
                  ],
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: '#4CAF50'
                }
              ]}
            >
              {userCount} videos
            </Animated.Text>
          </View>
          <TouchableOpacity 
            style={styles.signOutButton} 
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.currentWordContainer}>
        <Text style={styles.currentWordText}>{signLabel || "Loading..."}</Text>
      </View>

      {searchStatus.status !== 'none' && (
        <Text style={[
          styles.searchStatus,
          searchStatus.status === 'success' ? styles.successText : styles.errorText
        ]}>
          {searchStatus.message}
        </Text>
      )}
      
      <View style={styles.contentContainer}>
        <View style={styles.cameraContainer}>
          {isCameraEnabled ? (
            tempRecordedVideo ? (
              <View style={styles.previewContainer}>
                <VideoPlayer 
                  uri={tempRecordedVideo}
                  mimeType="video/webm"
                  signName="Preview"
                />
              </View>
            ) : (
              <VideoRecorder
                recordingInterval={recordingInterval}
                isRecording={isRecording}
                onRecordingComplete={handleRecordingComplete}
                quality={quality}
                fileType={fileType}
              />
            )
          ) : (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.placeholderText}>Camera Preview</Text>
            </View>
          )}
        </View>
        
        <View style={styles.rightContainer}>
          {(videoUri || videoBase64) && !tempRecordedVideo && (
              <VideoPlayer 
                uri={videoUri || undefined}
                base64Data={videoBase64 || undefined}
                mimeType={videoMimeType}
                signName={currentSignName}
              />
          )}
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.controlsLeft}>
          <View style={styles.controlItem}>
            <Text style={styles.controlText}>Camera</Text>
            <Switch
              value={isCameraEnabled}
              onValueChange={toggleCamera}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
            />
          </View>
        </View>

        {!isReviewing ? (
          <Pressable 
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive
            ]}
            onPress={toggleRecording}
            disabled={!isCameraEnabled}
          />
        ) : (
          <View style={styles.reviewButtonsContainer}>
            <TouchableOpacity 
              style={[styles.reviewButton, styles.saveButton]} 
              onPress={handleSave}
            >
              <Text style={styles.reviewButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.reviewButton, styles.discardButton]} 
              onPress={handleDiscard}
            >
              <Text style={styles.reviewButtonText}>Discard</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <SettingsOverlay />
      <CountdownOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  cameraContainer: {
    flex: 2,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    aspectRatio: 16/9,
  },
  previewContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  audioContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 10,
  },
  audioVisualizer: {
    flex: 1,
    width: '100%',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    minHeight: 48,
  },
  controlsLeft: {
    flexDirection: 'row',
    gap: 20,
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlText: {
    fontSize: 14,
    marginRight: 4,
  },
  recordButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff4444',
    cursor: 'pointer',
    opacity: 0.9,
  },
  recordButtonActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  settingsButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 20,
    padding: 10,
    marginRight: 10,
  },
  settingsButtonText: {
    fontSize: 20,
  },
  settingsOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 15,
    zIndex: 1,
  },
  hidden: {
    display: 'none',
  },
  settingGroup: {
    marginBottom: 15,
  },
  settingLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#81b0ff',
    borderColor: '#fff',
  },
  optionText: {
    color: 'white',
    fontSize: 14,
  },
  selectedOptionText: {
    fontWeight: '600',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 2,
  },
  countdownContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingIndicator: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  countdownText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  rightContainer: {
    flex: 1,
    gap: 10,
  },
  currentWordContainer: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    marginHorizontal: 10,
    alignSelf: 'center',
  },
  currentWordText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  searchStatus: {
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  successText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#f44336',
  },
  signOutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userInfo: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
  usernameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  userCountText: {
    fontSize: 12,
    color: '#666',
  },
  reviewButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    width: 100,
    justifyContent: 'center',
  },
  reviewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  discardButton: {
    backgroundColor: '#f44336',
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
