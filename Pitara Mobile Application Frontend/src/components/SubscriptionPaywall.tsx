import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface SubscriptionPaywallProps {
  /**
   * If true the paywall overlay is rendered. Otherwise returns null.
   */
  show: boolean;
  /**
   * Optional callback after the user chooses to subscribe (before navigation).
   */
  onSubscribe?: () => void;
}

/**
 * A full-screen modal overlay prompting the user to subscribe before watching content.
 *
 * It intentionally does **not** expose a close button – the only way forward is to subscribe
 * or navigate back. This matches common OTT UX patterns and simplifies the decision tree.
 */
const SubscriptionPaywall: React.FC<SubscriptionPaywallProps> = ({ show, onSubscribe }) => {
  const navigate = useNavigate();

  if (!show) return null;

  const handleSubscribeClick = () => {
    onSubscribe?.();
    navigate('/subscription', { state: { autoOpenPlans: true } });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-gradient-to-br from-black/80 via-pitara-purple/40 to-black/80"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-pitara-dark/90 backdrop-blur-md border border-pitara-purple/40 rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 text-center text-white"
      >
        <div className="flex flex-col items-center space-y-4">
          <Crown className="w-12 h-12 text-pitara-gold" />
          <h2 className="text-2xl font-semibold">Unlock Premium Content</h2>
          <p className="text-pitara-gray-light">
            Subscribe to one of our plans to watch this web series and enjoy unlimited streaming without ads.
          </p>

          {/* Benefits list */}
          <ul className="text-left space-y-2 text-sm mt-4">
            {[
              'Access all current & future episodes',
              'Download for offline viewing',
              'Full HD & 4K quality',
              'Ad-free experience'
            ].map((feature) => (
              <li key={feature} className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-pitara-gold" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            className="mt-6 w-full bg-pitara-gold hover:bg-pitara-gold/90 text-black font-semibold"
            onClick={handleSubscribeClick}
          >
            Subscribe Now
          </Button>
          <button
            className="mt-2 text-xs text-pitara-gray-light underline hover:text-pitara-gray"
            onClick={() => navigate(-1)}
          >
            Maybe later
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SubscriptionPaywall; 