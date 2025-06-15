
import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';

const UpcomingScreen = () => {
  const upcomingSeries = [
    {
      id: 1,
      title: 'Galactic Empires',
      image: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=300&fit=crop',
      releaseDate: '2024-07-15',
      description: 'Epic space opera spanning multiple galaxies'
    },
    {
      id: 2,
      title: 'Cyber Noir',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
      releaseDate: '2024-08-02',
      description: 'Dark cyberpunk thriller in Neo Tokyo'
    },
    {
      id: 3,
      title: 'Mystic Realms',
      image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop',
      releaseDate: '2024-08-20',
      description: 'Fantasy adventure in magical dimensions'
    },
    {
      id: 4,
      title: 'Quantum Detectives',
      image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=300&fit=crop',
      releaseDate: '2024-09-05',
      description: 'Crime solving across parallel universes'
    }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilRelease = (dateString: string) => {
    const releaseDate = new Date(dateString);
    const today = new Date();
    const diffTime = releaseDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-pitara-dark pt-20 pb-20 px-6">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">Upcoming Series</h1>
        <p className="text-pitara-gray-light">New series coming soon to Pitara</p>
      </motion.div>

      {/* Upcoming Series List */}
      <div className="space-y-6">
        {upcomingSeries.map((series, index) => {
          const daysUntilRelease = getDaysUntilRelease(series.releaseDate);
          
          return (
            <motion.div
              key={series.id}
              className="bg-pitara-gray rounded-xl overflow-hidden border border-pitara-purple/20 hover:border-pitara-gold/50 transition-all duration-300"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex flex-col md:flex-row">
                {/* Image */}
                <div className="relative w-full md:w-48 h-48 md:h-32 overflow-hidden">
                  <img
                    src={series.image}
                    alt={series.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-pitara-gray via-transparent to-transparent" />
                </div>

                {/* Content */}
                <div className="flex-1 p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-4 md:mb-0">
                      <h3 className="text-xl font-bold text-white mb-2">{series.title}</h3>
                      <p className="text-pitara-gray-light mb-3">{series.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2 text-pitara-gold">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(series.releaseDate)}</span>
                        </div>
                        
                        {daysUntilRelease > 0 && (
                          <div className="flex items-center space-x-2 text-pitara-purple-light">
                            <Clock className="w-4 h-4" />
                            <span>{daysUntilRelease} days to go</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Release Badge */}
                    <div className="flex-shrink-0">
                      {daysUntilRelease <= 0 ? (
                        <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                          Available Now
                        </div>
                      ) : daysUntilRelease <= 7 ? (
                        <div className="bg-pitara-gold text-black px-4 py-2 rounded-full text-sm font-semibold">
                          Coming Soon
                        </div>
                      ) : (
                        <div className="bg-pitara-purple text-white px-4 py-2 rounded-full text-sm font-semibold">
                          {daysUntilRelease} Days
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Call to Action */}
      <motion.div
        className="mt-12 text-center bg-gradient-to-r from-pitara-purple/20 to-pitara-gold/20 rounded-xl p-8 border border-pitara-purple/30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h3 className="text-2xl font-bold text-white mb-4">Never Miss a Release</h3>
        <p className="text-pitara-gray-light mb-6">Get notified when new series are available</p>
        <motion.button
          className="bg-pitara-gold text-black px-8 py-3 rounded-full font-semibold hover:bg-yellow-400 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Enable Notifications
        </motion.button>
      </motion.div>
    </div>
  );
};

export default UpcomingScreen;
