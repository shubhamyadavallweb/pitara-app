
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import GridSeriesCard from './GridSeriesCard';

interface Series {
  id: string;
  title: string;
  image: string;
  episodes: number;
  description: string;
}

interface SeriesGridProps {
  title: string;
  series: Series[];
}

const SeriesGrid: React.FC<SeriesGridProps> = ({ title, series }) => {
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-xl font-bold text-foreground mb-4 px-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4">
        {series.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <GridSeriesCard series={item} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SeriesGrid;
