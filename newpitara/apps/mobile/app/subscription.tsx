import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth, useSubscription, usePlans, usePaymentMonitor } from '@pitara/hooks';

interface Plan {
  id: string;
  name: string;
  price: number;
  period_days: number;
  description?: string;
  features?: string[];
}

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const { 
    subscription, 
    isSubscribed, 
    subscriptionTier, 
    subscriptionEnd,
    updateSubscription,
    createSubscription 
  } = useSubscription();
  const { data: plans, loading: plansLoading } = usePlans();
  const { payments } = usePaymentMonitor();
  
  const [activeTab, setActiveTab] = useState<'details' | 'plans'>('details');
  const [loading, setLoading] = useState(false);

  // Calculate subscription data
  const currentPlan = plans?.find(p => p.id === subscriptionTier);
  const daysLeft = subscriptionEnd ? 
    Math.max(0, Math.ceil((new Date(subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  const userPayments = payments.filter(
    p => p.user_email?.toLowerCase() === user?.email?.toLowerCase() && 
         ['paid', 'captured', 'authorized'].includes(p.status.toLowerCase())
  );

  const subscriptionData = {
    plan: currentPlan?.name || 'No plan',
    status: isSubscribed ? 'Active' : 'Inactive',
    price: currentPlan ? `₹${currentPlan.price}` : '-',
    startDate: subscription?.created_at ? new Date(subscription.created_at).toLocaleDateString() : '-',
    expiryDate: subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString() : '-',
    daysLeft,
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

  const iconMap: Record<string, any> = {
    trial: 'checkmark-circle',
    starter: 'time',
    popular: 'flash',
    extended: 'calendar',
    premium: 'star',
    ultimate: 'crown',
  };

  const subscriptionPlans = (plans || []).map(plan => ({
    id: plan.id,
    name: plan.name,
    price: `₹${plan.price}`,
    duration: `${plan.period_days} days`,
    icon: iconMap[plan.id] || 'card',
    popular: plan.id === 'popular',
    features: plan.features || [
      'HD Streaming',
      'Mobile Downloads',
      'Multiple Devices'
    ]
  }));

  const handleUpgrade = async (planId: string, planName: string) => {
    if (!user) {
      Alert.alert('Error', 'Please login to subscribe');
      return;
    }

    try {
      setLoading(true);
      
      Alert.alert(
        'Payment Integration',
        `This would integrate with Razorpay to process payment for ${planName} plan.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Simulate Payment', 
            onPress: async () => {
              // Simulate successful payment
              try {
                if (!subscription) {
                  await createSubscription(planId);
                } else {
                  await updateSubscription({
                    subscription_tier: planId,
                    subscribed: true,
                    subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                  });
                }
                
                Alert.alert('Success', 'Subscription activated successfully!');
                setActiveTab('details');
              } catch (error) {
                Alert.alert('Error', 'Failed to activate subscription');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  const getExpiryWarning = () => {
    if (!isSubscribed) return null;
    
    if (daysLeft <= 3) {
      return (
        <View style={[styles.warningBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <Ionicons name="warning" size={20} color="#EF4444" />
          <Text style={[styles.warningText, { color: '#EF4444' }]}>
            {daysLeft === 0 ? 'Subscription expired' : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
          </Text>
        </View>
      );
    } else if (daysLeft <= 7) {
      return (
        <View style={[styles.warningBanner, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
          <Ionicons name="time" size={20} color="#F59E0B" />
          <Text style={[styles.warningText, { color: '#F59E0B' }]}>
            Expires in {daysLeft} days
          </Text>
        </View>
      );
    }
    
    return null;
  };

  if (plansLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading subscription plans...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'plans' && styles.activeTab]}
          onPress={() => setActiveTab('plans')}
        >
          <Text style={[styles.tabText, activeTab === 'plans' && styles.activeTabText]}>
            Plans
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'details' ? (
          <View style={styles.detailsTab}>
            {getExpiryWarning()}
            
            {/* Current Subscription */}
            <View style={styles.subscriptionCard}>
              <View style={styles.subscriptionHeader}>
                <View style={styles.subscriptionStatus}>
                  <Ionicons 
                    name={isSubscribed ? "checkmark-circle" : "close-circle"} 
                    size={24} 
                    color={isSubscribed ? "#10B981" : "#EF4444"} 
                  />
                  <Text style={styles.subscriptionStatusText}>
                    {subscriptionData.status}
                  </Text>
                </View>
                <Text style={styles.subscriptionPlan}>{subscriptionData.plan}</Text>
              </View>

              <View style={styles.subscriptionDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>{subscriptionData.price}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Start Date</Text>
                  <Text style={styles.detailValue}>{subscriptionData.startDate}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Expiry Date</Text>
                  <Text style={styles.detailValue}>{subscriptionData.expiryDate}</Text>
                </View>
                {isSubscribed && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Days Remaining</Text>
                    <Text style={styles.detailValue}>{subscriptionData.daysLeft}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Features */}
            <View style={styles.featuresCard}>
              <Text style={styles.featuresTitle}>Subscription Features</Text>
              {subscriptionData.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark" size={20} color="#10B981" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => setActiveTab('plans')}
              >
                <Text style={styles.upgradeButtonText}>
                  {isSubscribed ? 'Upgrade Plan' : 'Subscribe Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.plansTab}>
            <Text style={styles.plansTitle}>Choose Your Plan</Text>
            <Text style={styles.plansSubtitle}>
              Select the perfect plan for your viewing needs
            </Text>

            {subscriptionPlans.map((plan) => (
              <View 
                key={plan.id} 
                style={[styles.planCard, plan.popular && styles.popularPlan]}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Most Popular</Text>
                  </View>
                )}
                
                <View style={styles.planHeader}>
                  <View style={styles.planIcon}>
                    <Ionicons name={plan.icon} size={24} color="#3B82F6" />
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDuration}>{plan.duration}</Text>
                  </View>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                </View>

                <View style={styles.planFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.planFeature}>
                      <Ionicons name="checkmark" size={16} color="#10B981" />
                      <Text style={styles.planFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.selectPlanButton,
                    plan.popular && styles.popularSelectButton,
                    subscriptionTier === plan.id && styles.currentPlanButton
                  ]}
                  onPress={() => handleUpgrade(plan.id, plan.name)}
                  disabled={loading || subscriptionTier === plan.id}
                >
                  <Text style={[
                    styles.selectPlanButtonText,
                    plan.popular && styles.popularSelectButtonText,
                    subscriptionTier === plan.id && styles.currentPlanButtonText
                  ]}>
                    {loading ? 'Processing...' :
                     subscriptionTier === plan.id ? 'Current Plan' :
                     'Select Plan'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  detailsTab: {
    paddingBottom: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  subscriptionCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  subscriptionHeader: {
    marginBottom: 20,
  },
  subscriptionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionStatusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  subscriptionPlan: {
    color: '#3B82F6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subscriptionDetails: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  featuresCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  featuresTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#D1D5DB',
    fontSize: 14,
    marginLeft: 12,
  },
  actionsContainer: {
    marginTop: 20,
  },
  upgradeButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  plansTab: {
    paddingBottom: 20,
  },
  plansTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  plansSubtitle: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  popularPlan: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  planDuration: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  planPrice: {
    color: '#3B82F6',
    fontSize: 20,
    fontWeight: 'bold',
  },
  planFeatures: {
    marginBottom: 16,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planFeatureText: {
    color: '#D1D5DB',
    fontSize: 14,
    marginLeft: 8,
  },
  selectPlanButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  popularSelectButton: {
    backgroundColor: '#3B82F6',
  },
  currentPlanButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  selectPlanButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  popularSelectButtonText: {
    color: '#fff',
  },
  currentPlanButtonText: {
    color: '#fff',
  },
}); 