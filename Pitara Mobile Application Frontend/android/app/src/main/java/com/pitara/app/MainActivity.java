package com.pitara.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "PitaraMainActivity";
    private Handler delayedIntentHandler = new Handler();
    private Runnable delayedIntentRunnable;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Handle deep link if app was started from one
        final Intent intent = getIntent();
        if (intent != null && intent.getData() != null) {
            Uri uri = intent.getData();
            String url = uri.toString();
            Log.d(TAG, "App started with deep link: " + url);
            
            // For cold start, wait briefly for bridge to initialize
            delayedIntentRunnable = new Runnable() {
                @Override
                public void run() {
                    // Try processing intent again after a delay
                    processIntent(intent);
                    
                    // Schedule another attempt just to be safe
                    delayedIntentHandler.postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            processIntent(intent);
                        }
                    }, 1000); // Another attempt after 1 more second
                }
            };
            
            // Process immediately
            processIntent(intent);
            
            // And schedule delayed processing to ensure it gets handled
            delayedIntentHandler.postDelayed(delayedIntentRunnable, 500);
        }
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        
        // Handle deep link when app is already running
        if (intent != null && intent.getData() != null) {
            Uri uri = intent.getData();
            String url = uri.toString();
            Log.d(TAG, "App received deep link: " + url);
            
            // Set this as current intent for processing
            setIntent(intent);
            
            // Cancel any pending intent processing
            if (delayedIntentRunnable != null) {
                delayedIntentHandler.removeCallbacks(delayedIntentRunnable);
            }
            
            // Process immediately
            processIntent(intent);
            
            // And also after a slight delay to ensure the bridge is ready
            delayedIntentHandler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    processIntent(intent);
                }
            }, 300);
        }
    }
    
    private void processIntent(Intent intent) {
        try {
            if (this.bridge != null) {
                Log.d(TAG, "Passing deep link to Capacitor bridge");
                
                // Ensure the data is still there (sometimes Android clears it)
                if (intent.getData() == null && intent.getDataString() != null) {
                    intent.setData(Uri.parse(intent.getDataString()));
                }
                
                this.bridge.onNewIntent(intent);
            } else {
                Log.e(TAG, "Bridge is null, can't process intent - will retry later");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing intent: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    @Override
    protected void onDestroy() {
        // Clear any pending callbacks
        if (delayedIntentRunnable != null) {
            delayedIntentHandler.removeCallbacks(delayedIntentRunnable);
        }
        super.onDestroy();
    }
}
