
import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Series {
  id: string;
  title: string;
  image: string;
  episodes: number;
}

interface SeriesCardProps {
  series: Series;
}

const SeriesCard: React.FC<SeriesCardProps> = ({ series }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      className="relative w-48 h-72 rounded-xl overflow-hidden bg-pitara-gray cursor-pointer group"
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Shimmer Loading Effect */}
      {!imageLoaded && (
        <div className="absolute inset-0 shimmer bg-pitara-gray-light" />
      )}

      {/* Series Image */}
      <motion.img
        src={series.image}
        alt={series.title}
        className="w-full h-full object-cover transition-opacity duration-300"
        style={{ opacity: imageLoaded ? 1 : 0 }}
        onLoad={() => setImageLoaded(true)}
        initial={{ scale: 1.1 }}
        animate={{ scale: imageLoaded ? 1 : 1.1 }}
        transition={{ duration: 0.6 }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300" />

      {/* Content */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 p-4 text-white"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 className="font-semibold text-lg mb-1 line-clamp-2">{series.title}</h3>
        <p className="text-sm text-pitara-gold">{series.episodes} Episodes</p>
      </motion.div>

      {/* Hover Effect */}
      <motion.div
        className="absolute inset-0 bg-pitara-purple/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        initial={false}
      />

      {/* Play Button on Hover */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <div className="w-12 h-12 bg-pitara-gold rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </motion.div>

      {/* Glow Effect */}
      <motion.div
        className="absolute -inset-1 bg-gradient-to-r from-pitara-purple to-pitara-gold rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"
        initial={false}
      />
    </motion.div>
  );
};

export default SeriesCard;
