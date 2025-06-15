import React from 'react';
import { motion } from 'framer-motion';
import FeaturedCarousel from '../components/FeaturedCarousel';
import SeriesGrid from '../components/SeriesGrid';
import { useSeriesData } from '../hooks/useSeriesData';

const HomeScreen = () => {
  const {
    featuredSeries,
    latestSeries,
    recommendedSeries,
    popularSeries,
    loading,
    error,
    refreshData
  } = useSeriesData();

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-16 pb-20 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading series...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pt-16 pb-20 flex items-center justify-center">
        <motion.div
          className="text-center px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-4xl mb-4">😞</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 pb-20">
      {/* Featured Carousel */}
      {featuredSeries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <FeaturedCarousel series={featuredSeries} />
        </motion.div>
      )}

      {/* Series Sections */}
      <div className="px-4 space-y-8">
        {/* Trending section removed as per new design */}

        {latestSeries.length > 0 && (
          <SeriesGrid 
            title="Latest Releases" 
            series={latestSeries}
          />
        )}

        {recommendedSeries.length > 0 && (
          <SeriesGrid 
            title="Recommended for You" 
            series={recommendedSeries}
          />
        )}

        {popularSeries.length > 0 && (
          <SeriesGrid 
            title="Popular Series" 
            series={popularSeries}
          />
        )}
      </div>

      {/* Pull to refresh hint */}
      <motion.div
        className="text-center py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <p className="text-sm text-muted-foreground">
          Content updates automatically from admin portal
        </p>
      </motion.div>
    </div>
  );
};

export default HomeScreen;
