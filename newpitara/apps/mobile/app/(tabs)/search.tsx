import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSeriesData } from '@pitara/hooks';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { allSeries, loading, error, refreshData } = useSeriesData();

  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return allSeries;
    
    const query = searchQuery.toLowerCase();
    return allSeries.filter(series =>
      series.title.toLowerCase().includes(query) ||
      series.description?.toLowerCase().includes(query) ||
      series.genre?.toLowerCase().includes(query)
    );
  }, [searchQuery, allSeries]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 300);
  };

  const navigateToSeries = (seriesId: string) => {
    router.push(`/series/${seriesId}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading series...</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Series</Text>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search web series, genres, descriptions..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {isSearching && (
            <ActivityIndicator size="small" color="#3B82F6" style={styles.searchSpinner} />
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {searchQuery && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsText}>
              {filteredSeries.length} results for "{searchQuery}"
            </Text>
          </View>
        )}

        {filteredSeries.length > 0 ? (
          <View style={styles.grid}>
            {filteredSeries.map((series, index) => (
              <TouchableOpacity
                key={series.id}
                style={styles.seriesCard}
                onPress={() => navigateToSeries(series.id)}
              >
                <View style={styles.thumbnailContainer}>
                  {series.image_url ? (
                    <Image source={{ uri: series.image_url }} style={styles.thumbnail} />
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
                <Text style={styles.episodeCount}>
                  {series.episodes.length} episodes
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : searchQuery ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyMessage}>Try searching with different keywords</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>Discover Amazing Series</Text>
            <Text style={styles.emptyMessage}>Search for your favorite web series</Text>
            <Text style={styles.emptySubMessage}>
              Content updates live from admin portal
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    padding: 20,
    paddingTop: 10,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  searchSpinner: {
    marginLeft: 12,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsText: {
    color: '#6B7280',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  seriesCard: {
    width: '47%',
    marginBottom: 20,
  },
  thumbnailContainer: {
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnail: {
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  seriesGenre: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 2,
  },
  episodeCount: {
    color: '#6B7280',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubMessage: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
}); 