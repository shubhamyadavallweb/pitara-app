
import React from 'react';
import { motion } from 'framer-motion';
import SeriesCard from './SeriesCard';

interface Series {
  id: string;
  title: string;
  image: string;
  episodes: number;
}

interface SeriesSectionProps {
  title: string;
  series: Series[];
  onSeriesClick?: (seriesId: string) => void;
}

const SeriesSection: React.FC<SeriesSectionProps> = ({ title, series, onSeriesClick }) => {
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h2
        className="text-2xl font-bold text-pitara-gold mb-6 px-2"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {title}
      </motion.h2>
      
      <div className="overflow-x-auto hide-scrollbar">
        <div className="flex space-x-4 px-2">
          {series.map((item, index) => (
            <motion.div
              key={item.id}
              className="flex-shrink-0"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.1,
                ease: "easeOut"
              }}
              onClick={() => onSeriesClick?.(item.id)}
            >
              <SeriesCard series={item} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SeriesSection;
