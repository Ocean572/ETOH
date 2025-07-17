// Simple auth state manager for handling logout across the app
type AuthStateListener = () => void;

class AuthStateManager {
  private listeners: AuthStateListener[] = [];

  addListener(listener: AuthStateListener) {
    this.listeners.push(listener);
  }

  removeListener(listener: AuthStateListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyAuthChanged() {
    this.listeners.forEach(listener => listener());
  }
}

export const authStateManager = new AuthStateManager();