
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface BrightnessOverlayProps {
  show: boolean;
  brightness: number;
  onBrightnessChange: (brightness: number) => void;
}

export const BrightnessOverlay: React.FC<BrightnessOverlayProps> = ({
  show,
  brightness,
  onBrightnessChange,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute left-8 top-1/2 transform -translate-y-1/2 bg-black/80 rounded-lg p-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <Sun className="w-6 h-6 text-white mb-2 mx-auto" />
          <div className="h-32 flex items-center">
            <Slider
              orientation="vertical"
              value={[brightness]}
              onValueChange={(value) => onBrightnessChange(value[0])}
              max={100}
              step={1}
              className="h-full"
            />
          </div>
          <div className="text-white text-center text-sm mt-2">{brightness}%</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
