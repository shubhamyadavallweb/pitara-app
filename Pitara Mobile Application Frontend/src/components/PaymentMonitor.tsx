import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Refresh, DollarSign, Users, TrendingUp } from 'lucide-react';

interface Payment {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  user_email: string;
  plan_id: string;
  amount: number; // in paise
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'cancelled';
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

const PaymentMonitor: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // This would connect to your actual Supabase client
  // For now, showing the concept with mock data
  const mockPayments: Payment[] = [
    {
      id: '1',
      razorpay_order_id: 'order_MzX8yHvY9g4Z7K',
      razorpay_payment_id: 'pay_MzX8yHvY9g4Z7K',
      user_email: 'shubham.1614@gmail.com',
      plan_id: 'trial',
      amount: 9900, // 99 rupees in paise
      currency: 'INR',
      status: 'paid',
      payment_method: 'card',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  useEffect(() => {
    // Mock initial load
    setTimeout(() => {
      setPayments(mockPayments);
      setLoading(false);
    }, 1000);

    // In real implementation, you would set up real-time subscription here:
    /*
    import { supabase } from '@/integrations/supabase/client';
    
    const channel = supabase
      .channel('payment-monitor')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, (payload) => {
        console.log('💰 Payment event:', payload);
        // Update payments state
        setLastUpdate(new Date());
      })
      .subscribe();
    
    return () => supabase.removeChannel(channel);
    */
  }, []);

  const totalRevenue = payments
    .filter(p => p.status === 'paid')
    .reduce((total, p) => total + p.amount, 0) / 100;

  const todaysPayments = payments.filter(p => 
    new Date(p.created_at).toDateString() === new Date().toDateString()
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'created': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment Monitor 💰</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLastUpdate(new Date())}
          >
            <Refresh className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-gray-500">
              {payments.filter(p => p.status === 'paid').length} successful payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Today's Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysPayments.length}</div>
            <p className="text-xs text-gray-500">
              ₹{(todaysPayments.reduce((sum, p) => sum + p.amount, 0) / 100).toFixed(2)} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.filter(p => p.status === 'created').length}
            </div>
            <p className="text-xs text-gray-500">
              Awaiting completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>
            Real-time payment updates - Just like authentication logs!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading payments...</div>
          ) : (
            <div className="space-y-3">
              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payments yet. Payments will appear here in real-time.
                </div>
              ) : (
                payments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(payment.status)}`} />
                      <div>
                        <div className="font-medium">{payment.user_email}</div>
                        <div className="text-sm text-gray-500">
                          {payment.plan_id} plan • {payment.payment_method || 'Unknown method'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₹{(payment.amount / 100).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {formatDate(payment.created_at)}
                      </div>
                    </div>
                    <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                      {payment.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">🚀 How to Access Real-Time Payments</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="space-y-2">
            <p><strong>Option 1:</strong> Supabase Dashboard → Table Editor → "payments" table</p>
            <p><strong>Option 2:</strong> Add this component to your admin panel</p>
            <p><strong>Option 3:</strong> Use real-time subscriptions in your code</p>
            <p className="text-sm mt-3">
              💡 <strong>Pro tip:</strong> Just like auth.users shows authentication events, 
              the payments table shows all payment events in real-time!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentMonitor; 