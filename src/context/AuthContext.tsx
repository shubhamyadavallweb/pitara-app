const signInWithGoogle = async () => {
  try {
    setIsLoading(true);
    console.log('🚀 === GOOGLE SIGN-IN DEBUG START ===');

    if (isNative) {
      try {
        console.log('📱 Platform: Native (Android/iOS)');
        console.log('🔧 Initializing GoogleAuth plugin...');
        
        await GoogleAuth.initialize({
          clientId: GOOGLE_WEB_CLIENT_ID,
          scopes: ['profile', 'email', 'openid'],
          forceCodeForRefreshToken: true
        });

        console.log('✅ GoogleAuth plugin initialized successfully');
        console.log('🎯 Launching Google account picker...');
        
        const googleUser = await GoogleAuth.signIn();
        
        console.log('📋 === COMPLETE GOOGLE USER RESPONSE ===');
        console.log('GoogleUser:', JSON.stringify(googleUser, null, 2));
        
        if (!googleUser?.authentication?.idToken) {
          throw new Error('No ID token received from Google');
        }

        console.log('🔗 === SUPABASE INTEGRATION START ===');
        
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: googleUser.authentication.idToken,
          nonce: undefined,
        });

        if (error) {
          console.error('❌ SUPABASE ERROR:', error);
          showToast({ message: `Login failed: ${error.message}`, type: 'error' });
          return;
        }

        if (data?.user && data?.session) {
          console.log('🎉 === SUCCESS: AUTHENTICATION COMPLETE ===');
          const transformedUser = transformSupabaseUser(data.user);
          setSession(data.session);
          setUser(transformedUser);
          await Preferences.set({ key: 'pitara_user', value: JSON.stringify(transformedUser) });
          showToast({ message: `Welcome ${transformedUser.name}!`, type: 'success' });
        }
      } catch (nativeErr: any) {
        console.error('💥 === NATIVE GOOGLE SIGN-IN ERROR ===', nativeErr);
        showToast({ message: nativeErr?.message || 'Native sign-in failed', type: 'error' });
      }
    } else {
      // ... existing code ...
    }
  } catch (err: any) {
    console.error('💥 === GENERAL SIGN-IN ERROR ===', err);
    showToast({ message: err?.message || 'Sign-in failed', type: 'error' });
  } finally {
    setIsLoading(false);
  }
}; 