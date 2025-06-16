interface ToastOptions {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export const showToast = (options: ToastOptions): void => {
  try {
    console.log(`${options.type.toUpperCase()}: ${options.message}`);
    
    // If we're on a platform with native toast capabilities, we could add
    // platform-specific implementation here in the future
    
  } catch (error) {
    console.error('Error showing toast:', error);
  }
}; 