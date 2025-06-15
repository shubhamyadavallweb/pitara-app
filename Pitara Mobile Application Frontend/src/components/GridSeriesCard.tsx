import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Series {
  id: string;
  title: string;
  image: string;
  episodes: number;
}

interface GridSeriesCardProps {
  series: Series;
}

const GridSeriesCard: React.FC<GridSeriesCardProps> = ({ series }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/series/${series.id}`);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/watch/${series.id}/1`);
  };

  return (
    <motion.div
      className="relative group cursor-pointer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted mb-2">
        {/* Loading Shimmer */}
        {!imageLoaded && (
          <div className="absolute inset-0 shimmer bg-muted" />
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

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play Button */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto"
          initial={false}
        >
          <motion.div
            className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePlayClick}
          >
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
          </motion.div>
        </motion.div>

        {/* Episode Count Badge */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
          {series.episodes} EP
        </div>
      </div>

      {/* Series Info */}
      <div className="space-y-1">
        <h3 className="font-medium text-sm leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {series.title}
        </h3>
      </div>
    </motion.div>
  );
};

export default GridSeriesCard;
