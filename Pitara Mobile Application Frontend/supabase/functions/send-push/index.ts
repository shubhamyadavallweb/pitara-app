import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  created_at: string;
}

interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'update' | 'promotional' | 'push';
  target_all_users: boolean;
  created_at: string;
  image_url?: string | null;
}

async function sendExpoPushNotification(tokens: string[], title: string, body: string, data?: any, image?: string | null) {
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: data || {},
    ...(image ? { image } : {}),
    ...(image ? { android: { image }, ios: { image } } : {})
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('Expo push result:', result);
    return result;
  } catch (error) {
    console.error('Error sending Expo push notification:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();
    const notification = record as NotificationPayload;

    console.log('Processing notification:', notification);

    // Get all device tokens
    const { data: deviceTokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('*');

    if (tokensError) {
      console.error('Error fetching device tokens:', tokensError);
      throw tokensError;
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      console.log('No device tokens found');
      return new Response(
        JSON.stringify({ message: 'No device tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter tokens based on notification targeting
    let targetTokens = deviceTokens;
    if (!notification.target_all_users) {
      // For now, we'll send to all users. In the future, you can add user targeting logic here
      console.log('Targeted notifications not implemented yet, sending to all users');
    }

    // Group tokens by platform
    const expoTokens = targetTokens
      .filter(dt => dt.token.startsWith('ExponentPushToken'))
      .map(dt => dt.token);

    console.log(`Sending to ${expoTokens.length} Expo tokens`);

    // Send Expo push notifications
    if (expoTokens.length > 0) {
      await sendExpoPushNotification(
        expoTokens,
        notification.title,
        notification.message,
        {
          type: notification.type,
          notificationId: notification.id,
        },
        notification.image_url ?? null
      );
    }

    // Update notification status to 'sent'
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ status: 'sent' })
      .eq('id', notification.id);

    if (updateError) {
      console.error('Error updating notification status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications sent successfully',
        sentTo: expoTokens.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 