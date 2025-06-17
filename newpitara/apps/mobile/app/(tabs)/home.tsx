import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert, 
  Modal, 
  SafeAreaView, 
  ActivityIndicator,
  Dimensions 
} from 'react-native';
import { VideoPlayer } from '../../components/VideoPlayer';
import { useSeriesData } from '@pitara/hooks';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  video_url: string;
  thumbnail_url?: string;
}

interface Series {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  image_url: string;
  genre: string;
  episodes: Episode[];
}

export default function Home() {
  const { 
    featuredSeries, 
    latestSeries, 
    recommendedSeries, 
    popularSeries, 
    loading, 
    error, 
    refreshData 
  } = useSeriesData();
  
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>('');

  const playVideo = (videoUrl: string, title: string) => {
    setSelectedVideoUrl(videoUrl);
    setSelectedVideoTitle(title);
  };

  const closeVideo = () => {
    setSelectedVideoUrl(null);
    setSelectedVideoTitle('');
  };

  const navigateToSeries = (seriesId: string) => {
    // Navigation will be implemented when expo-router is properly configured
    console.log('Navigate to series:', seriesId);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading content...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>😞</Text>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderSeriesCard = (series: Series, onPress: () => void) => (
    <TouchableOpacity key={series.id} style={styles.seriesCard} onPress={onPress}>
      <View style={styles.seriesThumbnail}>
        {series.image_url ? (
          <Image source={{ uri: series.image_url }} style={styles.thumbnailImage} />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Ionicons name="play-circle" size={40} color="#6B7280" />
          </View>
        )}
      </View>
      <Text style={styles.seriesTitle} numberOfLines={2}>
        {series.title}
      </Text>
      <Text style={styles.seriesGenre} numberOfLines={1}>
        {series.genre}
      </Text>
    </TouchableOpacity>
  );

  const renderFeaturedCarousel = () => {
    if (featuredSeries.length === 0) return null;

    return (
      <View style={styles.featuredSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          pagingEnabled
          style={styles.featuredCarousel}
        >
          {featuredSeries.map((series) => (
            <TouchableOpacity
              key={series.id}
              style={styles.featuredCard}
              onPress={() => navigateToSeries(series.id)}
            >
              <Image source={{ uri: series.image_url }} style={styles.featuredImage} />
              <View style={styles.featuredOverlay}>
                <Text style={styles.featuredTitle}>{series.title}</Text>
                <Text style={styles.featuredDescription} numberOfLines={3}>
                  {series.description}
                </Text>
                <View style={styles.featuredActions}>
                  <TouchableOpacity 
                    style={styles.playButton}
                    onPress={() => {
                      if (series.episodes.length > 0) {
                        playVideo(
                          series.episodes[0].video_url, 
                          `${series.title} - Episode 1`
                        );
                      }
                    }}
                  >
                    <Ionicons name="play" size={20} color="#fff" />
                    <Text style={styles.playButtonText}>Play</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSeriesSection = (title: string, series: Series[]) => {
    if (series.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seriesScroll}>
          {series.map((item) => 
            renderSeriesCard(item, () => navigateToSeries(item.id))
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.welcomeTitle}>Welcome to Pitara</Text>
            <Text style={styles.welcomeSubtitle}>Your favorite content awaits!</Text>
          </View>

          {renderFeaturedCarousel()}
          {renderSeriesSection('Latest Releases', latestSeries)}
          {renderSeriesSection('Recommended for You', recommendedSeries)}
          {renderSeriesSection('Popular Series', popularSeries)}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Content updates automatically from admin portal
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Video Player Modal */}
      <Modal
        visible={selectedVideoUrl !== null}
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        {selectedVideoUrl && (
          <VideoPlayer
            uri={selectedVideoUrl}
            title={selectedVideoTitle}
            onClose={closeVideo}
          />
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#6B7280',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 20,
  },
  featuredSection: {
    marginBottom: 30,
  },
  featuredCarousel: {
    height: 200,
  },
  featuredCard: {
    width: screenWidth,
    height: 200,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featuredDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 12,
  },
  featuredActions: {
    flexDirection: 'row',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  seriesScroll: {
    paddingLeft: 20,
  },
  seriesCard: {
    width: 160,
    marginRight: 15,
  },
  seriesThumbnail: {
    width: 160,
    height: 240,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  seriesGenre: {
    color: '#6B7280',
    fontSize: 12,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
  },
}); 