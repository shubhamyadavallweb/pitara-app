import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface CarouselSeries {
  id: string;
  title: string;
  image: string;
  episodes: number;
  description: string;
}

interface FeaturedCarouselProps {
  series: CarouselSeries[];
}

const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ series }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  const nextSlide = () => {
    if (series.length < 2) return;
    setCurrentIndex((prev) => (prev + 1) % series.length);
  };

  const prevSlide = () => {
    if (series.length < 2) return;
    setCurrentIndex((prev) => (prev - 1 + series.length) % series.length);
  };

  const currentSeries = series[currentIndex];

  return (
    <div className="relative h-96 mb-12 mx-6 rounded-2xl overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          className="relative w-full h-full"
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          onClick={() => navigate(`/series/${currentSeries.id}`)}
          role="button"
          aria-label={`Open ${currentSeries.title}`}
        >
          {/* Background Image with Parallax Effect */}
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.7 }}
          >
            <img
              src={currentSeries.image}
              alt={currentSeries.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          </motion.div>

          {/* Content */}
          <motion.div
            className="absolute bottom-0 left-0 p-8 text-white z-10"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.h2
              className="text-4xl font-bold text-pitara-gold mb-2"
              initial={{ x: -50 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {currentSeries.title}
            </motion.h2>
            <motion.p
              className="text-lg text-gray-300 mb-4 max-w-md"
              initial={{ x: -50 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {currentSeries.description}
            </motion.p>
            <motion.div
              className="flex items-center space-x-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <span className="bg-pitara-purple px-3 py-1 rounded-full text-sm font-semibold">
                {currentSeries.episodes} Episodes
              </span>
              <motion.button
                onClick={(e) => { e.stopPropagation(); navigate(`/series/${currentSeries.id}`); }}
                className="bg-pitara-gold text-black px-6 py-2 rounded-full font-semibold hover:bg-yellow-400 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Watch Now
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {series.length > 1 && (
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {series.length > 1 && (
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Dots Indicator */}
      {series.length > 1 && (
        <div className="absolute bottom-4 right-4 flex space-x-2">
          {series.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'bg-pitara-gold' : 'bg-white/50'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeaturedCarousel;
