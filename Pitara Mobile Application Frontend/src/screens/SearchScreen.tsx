
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import GridSeriesCard from '../components/GridSeriesCard';
import { useSeriesData } from '../hooks/useSeriesData';

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { allSeries, loading, error, refreshData } = useSeriesData();

  const filteredSeries = searchQuery
    ? allSeries.filter(series =>
        series.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        series.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        series.genre?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allSeries;

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 300);
  };

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
      <div className="min-h-screen bg-background pt-16 pb-20 flex items-center justify-center px-4">
        <motion.div
          className="text-center"
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
    <div className="min-h-screen bg-background pt-16 pb-20 px-4">
      {/* Search Header */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Search Series</h1>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            type="text"
            placeholder="Search web series, genres, descriptions..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-background border-border text-foreground pl-12 pr-4 py-3 rounded-xl focus:border-primary focus:ring-primary placeholder:text-muted-foreground"
          />
          {isSearching && (
            <motion.div
              className="absolute right-4 top-1/2 transform -translate-y-1/2"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Search Results */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {searchQuery && (
          <p className="text-muted-foreground text-sm mb-4">
            {filteredSeries.length} results for "{searchQuery}"
          </p>
        )}
      </motion.div>

      {/* Results Grid */}
      {filteredSeries.length > 0 ? (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4"
          layout
        >
          {filteredSeries.map((series, index) => (
            <motion.div
              key={series.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.02,
                ease: "easeOut"
              }}
            >
              <GridSeriesCard series={series} />
            </motion.div>
          ))}
        </motion.div>
      ) : searchQuery ? (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
          <p className="text-muted-foreground">Try searching with different keywords</p>
        </motion.div>
      ) : (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-4xl mb-4">✨</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Discover Amazing Series</h3>
          <p className="text-muted-foreground">Search for your favorite web series</p>
          <p className="text-sm text-muted-foreground mt-2">
            Content updates live from admin portal
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default SearchScreen;
