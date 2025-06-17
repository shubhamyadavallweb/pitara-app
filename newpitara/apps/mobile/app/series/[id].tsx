import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@pitara/supabase';
import { VideoPlayer } from '../../components/VideoPlayer';
import { useDownloads, useAuth } from '@pitara/hooks';

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  video_url: string;
  thumbnail_url?: string;
  description?: string;
  duration?: number;
}

interface Series {
  id: string;
  title: string;
  description: string;
  genre: string;
  image_url: string;
  status: string;
  episodes: Episode[];
  created_at: string;
}

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { addDownload } = useDownloads();
  
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchSeriesDetail();
    }
  }, [id]);

  const fetchSeriesDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: seriesData, error: seriesError } = await supabase
        .from('series_meta')
        .select(`
          *,
          episodes (
            id,
            title,
            episode_number,
            video_url,
            thumbnail_url,
            description,
            duration
          )
        `)
        .eq('id', id)
        .single();

      if (seriesError) throw seriesError;

      const formattedSeries: Series = {
        id: seriesData.id,
        title: seriesData.title,
        description: seriesData.description,
        genre: seriesData.genre,
        image_url: seriesData.image_url,
        status: seriesData.status,
        episodes: (seriesData.episodes || []).sort((a: any, b: any) => a.episode_number - b.episode_number),
        created_at: seriesData.created_at
      };

      setSeries(formattedSeries);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch series details');
      console.error('Error fetching series details:', err);
    } finally {
      setLoading(false);
    }
  };

  const playEpisode = (episode: Episode) => {
    setSelectedVideoUrl(episode.video_url);
    setSelectedVideoTitle(`${series?.title} - Episode ${episode.episode_number}`);
  };

  const closeVideo = () => {
    setSelectedVideoUrl(null);
    setSelectedVideoTitle('');
  };

  const downloadEpisode = async (episode: Episode) => {
    if (!series || !user) {
      Alert.alert('Error', 'Please login to download episodes');
      return;
    }

    try {
      await addDownload({
        title: episode.title,
        seriesId: series.id,
        seriesTitle: series.title,
        episodeId: episode.id,
        episodeNumber: episode.episode_number,
        videoUrl: episode.video_url,
        thumbnailUrl: episode.thumbnail_url,
        quality: '1080p'
      });

      Alert.alert('Download Added', 'Episode added to download queue');
    } catch (error) {
      Alert.alert('Error', 'Failed to add episode to downloads');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading series details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !series) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>😞</Text>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error || 'Series not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSeriesDetail}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Series Header */}
          <View style={styles.seriesHeader}>
            <Image source={{ uri: series.image_url }} style={styles.seriesPoster} />
            <View style={styles.seriesInfo}>
              <Text style={styles.seriesTitle}>{series.title}</Text>
              <Text style={styles.seriesGenre}>{series.genre}</Text>
              <Text style={styles.episodeCount}>{series.episodes.length} Episodes</Text>
              <Text style={styles.seriesDescription} numberOfLines={4}>
                {series.description}
              </Text>
            </View>
          </View>

          {/* Episodes List */}
          <View style={styles.episodesSection}>
            <Text style={styles.sectionTitle}>Episodes</Text>
            {series.episodes.map((episode) => (
              <TouchableOpacity
                key={episode.id}
                style={styles.episodeCard}
                onPress={() => playEpisode(episode)}
              >
                <View style={styles.episodeNumber}>
                  <Text style={styles.episodeNumberText}>{episode.episode_number}</Text>
                </View>
                
                <View style={styles.episodeThumbnail}>
                  {episode.thumbnail_url ? (
                    <Image source={{ uri: episode.thumbnail_url }} style={styles.thumbnailImage} />
                  ) : (
                    <View style={styles.placeholderThumbnail}>
                      <Ionicons name="play" size={24} color="#6B7280" />
                    </View>
                  )}
                </View>

                <View style={styles.episodeInfo}>
                  <Text style={styles.episodeTitle} numberOfLines={2}>
                    {episode.title}
                  </Text>
                  {episode.description && (
                    <Text style={styles.episodeDescription} numberOfLines={2}>
                      {episode.description}
                    </Text>
                  )}
                  {episode.duration && (
                    <Text style={styles.episodeDuration}>
                      {Math.floor(episode.duration / 60)}min
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => downloadEpisode(episode)}
                >
                  <Ionicons name="download-outline" size={20} color="#3B82F6" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  seriesHeader: {
    flexDirection: 'row',
    padding: 20,
  },
  seriesPoster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginRight: 16,
  },
  seriesInfo: {
    flex: 1,
  },
  seriesTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  seriesGenre: {
    color: '#3B82F6',
    fontSize: 16,
    marginBottom: 4,
  },
  episodeCount: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 12,
  },
  seriesDescription: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
  episodesSection: {
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  episodeNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  episodeNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  episodeThumbnail: {
    width: 80,
    height: 45,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  episodeDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
  },
  episodeDuration: {
    color: '#6B7280',
    fontSize: 12,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 