
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface VolumeOverlayProps {
  show: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export const VolumeOverlay: React.FC<VolumeOverlayProps> = ({
  show,
  volume,
  onVolumeChange,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute right-8 top-1/2 transform -translate-y-1/2 bg-black/80 rounded-lg p-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
        >
          <Volume2 className="w-6 h-6 text-white mb-2 mx-auto" />
          <div className="h-32 flex items-center">
            <Slider
              orientation="vertical"
              value={[volume]}
              onValueChange={(value) => onVolumeChange(value[0])}
              max={100}
              step={1}
              className="h-full"
            />
          </div>
          <div className="text-white text-center text-sm mt-2">{volume}%</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
