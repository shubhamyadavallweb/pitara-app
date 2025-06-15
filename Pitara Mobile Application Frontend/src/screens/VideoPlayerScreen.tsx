import React from 'react';
import { VideoPlayer } from '@/components/video-player/VideoPlayer';
import { useSubscription } from '@/hooks/useSubscription';
import SubscriptionPaywall from '@/components/SubscriptionPaywall';

/**
 * Screen responsible for rendering the `VideoPlayer` component. If the user
 * does not have an active subscription it shows the `SubscriptionPaywall`
 * instead, prompting them to upgrade before watching.
 */
const VideoPlayerScreen = () => {
  const { isSubscribed, loading } = useSubscription();

  // While we don't yet know the subscription state, keep the UI blank to avoid
  // flashing the player beneath the paywall.
  if (loading) {
    return null;
  }

  if (!isSubscribed) {
    return <SubscriptionPaywall show />;
  }

  return <VideoPlayer />;
};

export default VideoPlayerScreen;
