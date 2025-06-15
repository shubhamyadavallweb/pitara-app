import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Calendar, Crown, Clock, CheckCircle, AlertTriangle, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePlans } from '@/hooks/usePlans';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/context/AuthContext';
import { usePaymentMonitor } from '@/hooks/usePaymentMonitor';
import { useLocation } from 'react-router-dom';

const SubscriptionScreen = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>(() => (location.state as any)?.autoOpenPlans ? 'plans' : 'details');

  // 👉 Dynamic subscription data
  const {
    subscription,
    loading: _subscriptionLoading,
    isSubscribed,
    subscriptionTier,
    subscriptionEnd,
    refreshSubscription,
    updateSubscription,
    createSubscription
  } = useSubscription();

  const { user } = useAuth();

  // Fetch user payments (history)
  const {
    payments,
    loading: _paymentsLoading
  } = usePaymentMonitor();

  // Fetch plans from Supabase using React Query
  const { data: plans } = usePlans();

  const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    trial: CheckCircle,
    starter: Clock,
    popular: Zap,
    extended: Calendar,
    premium: Star,
    ultimate: Crown,
  };

  const subscriptionPlans = (plans ?? []).map((plan) => {
    const Icon = IconMap[plan.id] ?? CreditCard;
    return {
      id: plan.id,
      name: plan.name,
      price: `₹${plan.price}`,
      duration: `${plan.period_days} days`,
      savings: '',
      icon: Icon,
      popular: plan.id === 'popular',
      badge: plan.id === 'popular' ? 'Most Popular' : undefined,
      badgeColor: plan.id === 'popular' ? 'bg-primary' : undefined,
    };
  });

  // fallback if plans not loaded yet
  if (subscriptionPlans.length === 0) {
    subscriptionPlans.push({
      id: 'loading',
      name: 'Loading...',
      price: '',
      duration: '',
      savings: '',
      icon: CreditCard,
      popular: false,
      badge: undefined,
      badgeColor: undefined,
    } as any);
  }

  // Compute derived subscription data for UI
  const currentPlan = (plans ?? []).find((p) => p.id === subscriptionTier || p.name.toLowerCase() === (subscriptionTier ?? '').toLowerCase());

  const daysLeftCalc = subscriptionEnd ? Math.max(0, Math.ceil((new Date(subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  const subscriptionData = {
    plan: currentPlan?.name ?? 'No plan',
    status: isSubscribed ? 'Active' : 'Inactive',
    price: currentPlan ? `₹${currentPlan.price}` : '-',
    startDate: subscription && (subscription as any).created_at ? new Date((subscription as any).created_at).toLocaleDateString() : '-',
    expiryDate: subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString() : '-',
    daysLeft: daysLeftCalc,
    features: [
      'Unlimited streaming',
      'Download up to 50 episodes',
      '4K Ultra HD quality',
      'Watch on up to 5 devices',
      'Early access to new series',
      'Ad-free experience',
      'Offline downloads'
    ]
  };

  const userPayments = payments.filter(
    (p) => p.user_email?.toLowerCase() === user?.email?.toLowerCase() && ['paid', 'captured', 'authorized'].includes(String(p.status).toLowerCase())
  );

  // Fall back: if subscriber missing, derive current plan from latest payment
  const latestPaidPayment = userPayments.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  if (latestPaidPayment) {
    const planRow = plans?.find(pl => pl.id === latestPaidPayment.plan_id);

    // Compute expiry based on payment period
    const period = planRow?.period_days ?? 0;
    const paymentExpiry = (() => {
      const d = new Date(latestPaidPayment.created_at);
      d.setDate(d.getDate() + period);
      return d;
    })();

    const subscriberExpiryDate = subscriptionEnd ? new Date(subscriptionEnd) : null;

    // If subscriber record missing OR payment expiry is newer than subscriber expiry, prefer payment data
    if (!subscriberExpiryDate || paymentExpiry.getTime() > subscriberExpiryDate.getTime()) {
      subscriptionData.plan = planRow?.name ?? latestPaidPayment.plan_id;
      subscriptionData.status = 'Active';
      subscriptionData.price = `₹${(latestPaidPayment.amount / 100).toFixed(0)}`;
      subscriptionData.startDate = new Date(latestPaidPayment.created_at).toLocaleDateString();
      subscriptionData.expiryDate = paymentExpiry.toLocaleDateString();
      subscriptionData.daysLeft = Math.max(0, Math.ceil((paymentExpiry.getTime() - Date.now())/ (1000*60*60*24)));
    }
  }

  // 🔄 Keep subscriber record in sync with latest successful payment
  useEffect(() => {
    (async () => {
      if (!latestPaidPayment) return;

      const planRow = plans?.find(pl => pl.id === latestPaidPayment.plan_id);
      if (!planRow) return;

      const period = planRow.period_days ?? 0;
      const paymentExpiry = new Date(latestPaidPayment.created_at);
      paymentExpiry.setDate(paymentExpiry.getDate() + period);

      const needsCreation = !subscription;
      const needsUpdate = subscription && (
        subscription.subscription_tier !== latestPaidPayment.plan_id ||
        (subscription.subscription_end && new Date(subscription.subscription_end).getTime() < paymentExpiry.getTime())
      );

      try {
        if (needsCreation) {
          const newSub = await createSubscription(latestPaidPayment.plan_id);
          if (newSub) {
            await updateSubscription({ subscription_end: paymentExpiry.toISOString() });
          }
        } else if (needsUpdate) {
          await updateSubscription({
            subscribed: true,
            subscription_tier: latestPaidPayment.plan_id,
            subscription_end: paymentExpiry.toISOString()
          });
        }
      } catch (err) {
        console.error('Failed to sync subscription record:', err);
      }
    })();
  }, [latestPaidPayment, plans, subscription]);

  const handleManageSubscription = () => {
    toast({
      title: "Manage Subscription",
      description: "Redirecting to subscription management...",
    });
  };

  const handleCancelSubscription = () => {
    toast({
      title: "Cancel Subscription",
      description: "Your subscription will remain active until the expiry date.",
    });
  };

  const handleUpgrade = async (planId: string, planName: string) => {
    try {
      toast({
        title: 'Creating Checkout',
        description: `Processing ${planName} plan…`,
      });

      console.log('🚀 Starting checkout process for plan:', planId);

      // Get the current session (but don't require it for now)
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('📋 Session status:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        hasAccessToken: !!session?.access_token
      });

      // Use the WORKING edge function without strict auth requirement
      console.log('📞 Calling create-checkout edge function...');
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan_id: planId,
          customer_name: session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User',
          customer_email: session?.user?.email || 'test@example.com'
        }
      });

      if (error) {
        console.error('❌ Edge function error details:', {
          error,
          message: error.message,
          status: error.status,
          statusCode: error.statusCode,
          details: error.details,
          stack: error.stack
        });
        
        // More detailed error handling
        if (error.message && error.message.includes('Invalid JWT')) {
          throw new Error('Authentication error. Please refresh the page and try again.');
        } else if (error.message && error.message.includes('401')) {
          throw new Error('Authentication failed. Please check your connection.');
        } else if (error.status === 404) {
          throw new Error('Payment service not found. Please contact support.');
        } else if (error.statusCode && error.statusCode >= 500) {
          throw new Error('Server error. Please try again in a moment.');
        }
        
        throw new Error(error.message || `Payment service error (${error.status || 'unknown'})`);
      }

      console.log('✅ Checkout response successful:', {
        data,
        hasOrderId: !!data?.order_id,
        hasRazorpayKey: !!data?.razorpay_key,
        amount: data?.amount,
        currency: data?.currency
      });

      // Handle different response formats
      if (data?.checkout_url) {
        // Traditional subscription checkout URL
        window.open(data.checkout_url, '_blank');
      } else if (data?.order_id && data?.razorpay_key) {
        // New Razorpay order format - open Razorpay checkout
        const options = {
          key: data.razorpay_key,
          amount: data.amount,
          currency: data.currency,
          name: data.name || 'Pitara',
          description: data.description || `${planName} Plan`,
          order_id: data.order_id,
          prefill: data.prefill || {},
          theme: {
            color: '#3399cc'
          },
          handler: async function (response: any) {
            console.log('Payment successful:', response);
            
            toast({
              title: 'Payment Successful! 🎉',
              description: `Payment ID: ${response.razorpay_payment_id}. Your subscription will be activated shortly.`,
            });

            // ✅ NEW: Immediately verify payment with backend so subscription gets activated even if webhook fails
            try {
              const { data: verificationData, error: verificationError } = await supabase.functions.invoke('verify-payment', {
                body: {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });
              if (verificationError) {
                console.error('Payment verification failed:', verificationError);
              } else {
                console.log('Payment verification response:', verificationData);
              }
            } catch (verificationException) {
              console.error('Unexpected error during payment verification:', verificationException);
            }

            // ✅ CRITICAL: Refresh subscription status after successful payment
            setTimeout(async () => {
              try {
                // Trigger subscription refresh
                const { data: refreshedSession } = await supabase.auth.refreshSession();
                
                // Show success message
                toast({
                  title: 'Subscription Activated! 🚀',
                  description: `Welcome to ${planName}! Enjoy unlimited access to all content.`,
                });
                
                // Optionally refresh the page or redirect
                window.location.reload();
              } catch (error) {
                console.error('Error refreshing subscription:', error);
                toast({
                  title: 'Payment Successful',
                  description: 'Your subscription is being activated. Please refresh the page in a moment.',
                });
              }
            }, 3000); // Wait 3 seconds for webhook to process
          },
          modal: {
            ondismiss: function() {
              toast({
                title: 'Payment Cancelled',
                description: 'You can try again anytime.',
                variant: 'destructive'
              });
            }
          }
        };

        // Load Razorpay script dynamically if not already loaded
        if (typeof (window as any).Razorpay === 'undefined') {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => {
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
          };
          script.onerror = () => {
            toast({
              title: 'Error',
              description: 'Failed to load payment gateway',
              variant: 'destructive'
            });
          };
          document.head.appendChild(script);
        } else {
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        }
      } else {
        throw new Error('Invalid response format from payment service');
      }
    } catch (err: any) {
      console.error('Checkout error', err);
      toast({
        title: 'Error',
        description: err.message ?? 'Failed to create checkout',
        variant: 'destructive'
      });
    }
  };

  const getExpiryWarning = () => {
    if (subscriptionData.daysLeft <= 7) {
      return {
        show: true,
        message: `Your subscription expires in ${subscriptionData.daysLeft} days`,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      };
    } else if (subscriptionData.daysLeft <= 30) {
      return {
        show: true,
        message: `Your subscription expires in ${subscriptionData.daysLeft} days`,
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      };
    }
    return { show: false };
  };

  const expiryWarning = getExpiryWarning();

  return (
    <div className="min-h-screen bg-background pt-20 pb-20 px-6">
      <motion.div
        className="max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Subscription</h1>
        </div>

        {/* Expiry Warning */}
        {expiryWarning.show && (
          <motion.div
            className={`p-4 rounded-xl mb-6 border ${expiryWarning.bgColor}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center space-x-3">
              <AlertTriangle className={`w-5 h-5 ${expiryWarning.color}`} />
              <p className={`text-sm font-medium ${expiryWarning.color}`}>
                {expiryWarning.message}
              </p>
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex bg-card rounded-lg p-1 mb-6 border border-border">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Current Plan
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'plans'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Plans
          </button>
        </div>

        {/* Content */}
        {activeTab === 'details' ? (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Current Plan */}
            <div className="bg-card rounded-xl p-6 mb-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{subscriptionData.plan}</h3>
                    <p className="text-sm text-muted-foreground">{subscriptionData.price}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {subscriptionData.status}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Started</span>
                  <span className="text-sm text-foreground">{subscriptionData.startDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expires on</span>
                  <span className="text-sm text-foreground">{subscriptionData.expiryDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Days remaining</span>
                  <span className={`text-sm font-medium ${subscriptionData.daysLeft <= 7 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                    {subscriptionData.daysLeft} days
                  </span>
                </div>
              </div>
            </div>

            {/* Features */}
            {/* Removed plan features and action buttons per new UX requirement. */}
          </motion.div>
        ) : activeTab === 'plans' ? (
          <motion.div
            key="plans"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              {subscriptionPlans.map((plan, index) => {
                const Icon = plan.icon;
                return (
                  <motion.div
                    key={plan.id}
                    className={`relative bg-card rounded-xl p-4 border transition-all duration-300 hover:scale-[1.02] ${
                      plan.popular ? 'border-primary shadow-lg' : 'border-border'
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    {plan.badge && (
                      <div className={`absolute -top-2 left-4 px-3 py-1 rounded-full text-xs font-bold text-white ${plan.badgeColor}`}>
                        {plan.badge}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.duration}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{plan.price}</p>
                        {plan.savings && (
                          <p className="text-xs text-green-600 dark:text-green-400">{plan.savings}</p>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleUpgrade(plan.id, plan.name)}
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {subscriptionData.plan === plan.name ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : null /* History tab removed */
        }
      </motion.div>
    </div>
  );
};

export default SubscriptionScreen;
