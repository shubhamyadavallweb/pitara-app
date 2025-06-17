import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  StatusBar,
  PanResponder,
  Animated,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface VideoPlayerProps {
  uri: string;
  title?: string;
  thumbnail?: string;
  isVisible: boolean;
  onClose: () => void;
  onProgress?: (progress: number) => void;
  startPosition?: number;
}

export default function VideoPlayer({
  uri,
  title,
  isVisible,
  onClose,
  onProgress,
  startPosition = 0,
}: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus>({} as AVPlaybackStatus);
  const [isPlaying, setIsPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [brightness, setBrightness] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Animated values for brightness overlay
  const brightnessOpacity = useRef(new Animated.Value(0)).current;
  const volumeOpacity = useRef(new Animated.Value(0)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (controlsVisible) {
      const timer = setTimeout(() => {
        hideControls();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [controlsVisible, isPlaying]);

  // Set initial position when video loads
  useEffect(() => {
    if (startPosition > 0 && videoRef.current) {
      videoRef.current.setPositionAsync(startPosition * 1000);
    }
  }, [startPosition]);

  const showControls = () => {
    setControlsVisible(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideControls = () => {
    if (isPlaying) {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setControlsVisible(false);
      });
    }
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    
    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const handleSeek = async (seekPosition: number) => {
    if (!videoRef.current || !duration) return;
    
    const seekTime = (seekPosition / 100) * duration * 1000;
    try {
      await videoRef.current.setPositionAsync(seekTime);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const onPlaybackStatusUpdate = (playbackStatus: AVPlaybackStatus) => {
    setStatus(playbackStatus);
    
    if (playbackStatus.isLoaded) {
      setIsPlaying(playbackStatus.isPlaying || false);
      setIsBuffering(playbackStatus.isBuffering || false);
      setDuration(playbackStatus.durationMillis || 0);
      setPosition(playbackStatus.positionMillis || 0);
      
      if (onProgress && playbackStatus.durationMillis) {
        const progress = (playbackStatus.positionMillis || 0) / playbackStatus.durationMillis;
        onProgress(progress);
      }
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.setVolumeAsync(newVolume);
    }
    
    // Show volume indicator
    Animated.sequence([
      Animated.timing(volumeOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(volumeOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      showControls();
    },
    onPanResponderMove: (evt, gestureState) => {
      // Handle brightness and volume gestures
      const { dx, dy } = gestureState;
      const { locationX } = evt.nativeEvent;
      
      if (Math.abs(dy) > Math.abs(dx)) {
        if (locationX < screenWidth / 2) {
          // Left side - brightness
          const newBrightness = Math.max(0.1, Math.min(1, brightness - dy / 200));
          setBrightness(newBrightness);
        } else {
          // Right side - volume
          const newVolume = Math.max(0, Math.min(1, volume - dy / 200));
          handleVolumeChange(newVolume);
        }
      }
    },
    onPanResponderRelease: () => {
      // Reset brightness overlay
      Animated.timing(brightnessOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    },
  });

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['landscape', 'portrait']}
    >
      <StatusBar hidden />
      <View style={styles.container} {...panResponder.panHandlers}>
        {/* Video Player */}
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          volume={volume}
        />

        {/* Brightness Overlay */}
        <Animated.View 
          style={[
            styles.brightnessOverlay,
            { 
              opacity: brightnessOpacity,
              backgroundColor: `rgba(0, 0, 0, ${1 - brightness})` 
            }
          ]} 
          pointerEvents="none"
        />

        {/* Loading Indicator */}
        {isBuffering && (
          <View style={styles.loadingContainer}>
            <Ionicons name="hourglass" size={40} color="#fff" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {/* Controls Overlay */}
        <Animated.View 
          style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
          {/* Top Controls */}
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'transparent']}
            style={styles.topControls}
          >
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
            {title && <Text style={styles.videoTitle} numberOfLines={1}>{title}</Text>}
            <View style={styles.topRightControls}>
              <TouchableOpacity onPress={() => setIsFullscreen(!isFullscreen)}>
                <Ionicons 
                  name={isFullscreen ? "contract" : "expand"} 
                  size={24} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Center Play/Pause Button */}
          <View style={styles.centerControls}>
            <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseButton}>
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={60} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.bottomControls}
          >
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill,
                      { width: `${duration ? (position / duration) * 100 : 0}%` }
                    ]}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.progressThumb,
                    { left: `${duration ? (position / duration) * 100 : 0}%` }
                  ]}
                  onPress={(e) => {
                    const { locationX } = e.nativeEvent;
                    const progressWidth = e.currentTarget.measure?.() || 0;
                    const percentage = (locationX / progressWidth) * 100;
                    handleSeek(percentage);
                  }}
                />
              </View>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="play-skip-back" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={togglePlayPause} style={styles.actionButton}>
                <Ionicons 
                  name={isPlaying ? "pause" : "play"} 
                  size={32} 
                  color="#fff" 
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="play-skip-forward" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="volume-high" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Volume Indicator */}
        <Animated.View style={[styles.volumeIndicator, { opacity: volumeOpacity }]}>
          <Ionicons name="volume-high" size={24} color="#fff" />
          <View style={styles.volumeBar}>
            <View style={[styles.volumeFill, { width: `${volume * 100}%` }]} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  video: {
    width: screenWidth,
    height: screenHeight,
  },
  brightnessOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  videoTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 15,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 15,
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    padding: 20,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomControls: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
    width: 45,
    textAlign: 'center',
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 15,
    position: 'relative',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    transform: [{ translateX: -8 }],
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  actionButton: {
    padding: 8,
  },
  volumeIndicator: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -25 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
  },
  volumeBar: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginLeft: 10,
    borderRadius: 2,
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
}); 