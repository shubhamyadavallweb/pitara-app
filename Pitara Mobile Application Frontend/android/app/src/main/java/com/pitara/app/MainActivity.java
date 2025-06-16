package com.pitara.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "PitaraMainActivity";
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Handle deep link if app was started from one
        Intent intent = getIntent();
        if (intent != null && intent.getData() != null) {
            String url = intent.getData().toString();
            Log.d(TAG, "App started with deep link: " + url);
            
            // Ensure we process this intent in the Capacitor bridge
            this.processIntent(intent);
        }
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        
        // Handle deep link when app is already running
        if (intent != null && intent.getData() != null) {
            String url = intent.getData().toString();
            Log.d(TAG, "App received deep link: " + url);
            
            // Set this as current intent for processing
            setIntent(intent);
            
            // Ensure we process this intent in the Capacitor bridge
            this.processIntent(intent);
        }
    }
    
    private void processIntent(Intent intent) {
        try {
            if (this.bridge != null) {
                Log.d(TAG, "Passing deep link to Capacitor bridge");
                this.bridge.onNewIntent(intent);
            } else {
                Log.e(TAG, "Bridge is null, can't process intent");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing intent: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
