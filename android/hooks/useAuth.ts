import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricType: LocalAuthentication.AuthenticationType | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    biometricType: null,
  });

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (!hasHardware) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Device does not support biometric authentication',
        }));
        return;
      }

      if (!isEnrolled) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'No biometrics enrolled on this device',
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        biometricType: supportedTypes[0] || null,
      }));
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to check biometric support',
      }));
    }
  };

  const authenticate = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '채팅을 보려면 잠금을 해제하세요',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setState(prev => ({ ...prev, isAuthenticated: true, isLoading: false }));
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Authentication failed',
        }));
        return false;
      }
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Authentication error occurred',
      }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setState(prev => ({ ...prev, isAuthenticated: false }));
  }, []);

  return {
    ...state,
    authenticate,
    logout,
    checkBiometricSupport,
  };
}
