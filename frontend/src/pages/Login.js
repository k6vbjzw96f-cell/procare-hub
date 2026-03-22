import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, Mail, KeyRound, CheckCircle2, Building2, ShieldCheck, Lock, ExternalLink, Fingerprint, Smartphone, Check, X, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Social Login Icons
const MicrosoftIcon = ({ className }) => (
  <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
  </svg>
);

const GoogleIcon = ({ className }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = ({ className }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const LinkedInIcon = ({ className }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

// Password Strength Calculator
const calculatePasswordStrength = (password) => {
  let strength = 0;
  let feedback = [];
  
  if (password.length === 0) return { strength: 0, label: '', color: '', feedback: [] };
  
  // Length check
  if (password.length >= 8) {
    strength += 25;
  } else {
    feedback.push('At least 8 characters');
  }
  
  // Uppercase check
  if (/[A-Z]/.test(password)) {
    strength += 25;
  } else {
    feedback.push('One uppercase letter');
  }
  
  // Lowercase check
  if (/[a-z]/.test(password)) {
    strength += 15;
  } else {
    feedback.push('One lowercase letter');
  }
  
  // Number check
  if (/[0-9]/.test(password)) {
    strength += 20;
  } else {
    feedback.push('One number');
  }
  
  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    strength += 15;
  } else {
    feedback.push('One special character');
  }
  
  let label = '';
  let color = '';
  
  if (strength < 30) {
    label = 'Weak';
    color = 'bg-red-500';
  } else if (strength < 60) {
    label = 'Fair';
    color = 'bg-orange-500';
  } else if (strength < 80) {
    label = 'Good';
    color = 'bg-yellow-500';
  } else {
    label = 'Strong';
    color = 'bg-emerald-500';
  }
  
  return { strength, label, color, feedback };
};

// Password Strength Indicator Component
const PasswordStrengthIndicator = ({ password }) => {
  const { strength, label, color, feedback } = calculatePasswordStrength(password);
  
  if (!password) return null;
  
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <Progress value={strength} className="h-2 flex-1" indicatorClassName={color} />
        <span className={`text-xs font-medium ${
          label === 'Weak' ? 'text-red-600' :
          label === 'Fair' ? 'text-orange-600' :
          label === 'Good' ? 'text-yellow-600' :
          'text-emerald-600'
        }`}>
          {label}
        </span>
      </div>
      {feedback.length > 0 && strength < 80 && (
        <div className="text-xs text-slate-500 space-y-1">
          <p className="font-medium">Add for stronger password:</p>
          <ul className="space-y-0.5">
            {feedback.map((item, i) => (
              <li key={i} className="flex items-center gap-1">
                <X className="w-3 h-3 text-slate-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {strength >= 80 && (
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <Check className="w-3 h-3" />
          Great password!
        </div>
      )}
    </div>
  );
};

const Login = ({ onLogin }) => {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'coordinator',
  });
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState({ microsoft: false, google: false, apple: false, linkedin: false });
  const [rememberMe, setRememberMe] = useState(false);
  
  // 2FA State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingLoginData, setPendingLoginData] = useState(null);
  
  // Biometric State
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  
  // Forgot password state
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: enter email, 2: enter code, 3: new password
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    if (window.PublicKeyCredential) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricAvailable(available);
      } catch {
        setBiometricAvailable(false);
      }
    }
  };

  // Biometric Login Handler
  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      // Check if user has registered biometrics
      const storedCredentialId = localStorage.getItem('biometric_credential_id');
      const storedEmail = localStorage.getItem('biometric_email');
      
      if (!storedCredentialId || !storedEmail) {
        toast.error('No biometric login configured. Please login with password first, then enable biometrics in Settings.');
        setBiometricLoading(false);
        return;
      }

      // Create WebAuthn assertion options
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const publicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        allowCredentials: [{
          id: Uint8Array.from(atob(storedCredentialId), c => c.charCodeAt(0)),
          type: 'public-key',
          transports: ['internal']
        }]
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      if (credential) {
        // Verify with backend (for now, we'll do a simplified check)
        const response = await axios.post(`${API}/auth/biometric-login`, {
          email: storedEmail,
          credential_id: storedCredentialId
        });
        
        toast.success('Biometric login successful!');
        onLogin(response.data.access_token, response.data.user);
      }
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled or not allowed');
      } else {
        toast.error('Biometric login failed. Please try password login.');
      }
    }
    setBiometricLoading(false);
  };

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('remembered_email');
    if (rememberedEmail) {
      setLoginData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  // Handle SSO callback on component mount
  useEffect(() => {
    const handleSSOCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        // Determine provider from stored state or URL pattern
        const storedMicrosoftState = sessionStorage.getItem('microsoft_sso_state');
        const storedGoogleState = sessionStorage.getItem('google_sso_state');
        
        let provider = null;
        if (state === storedMicrosoftState) {
          provider = 'microsoft';
          sessionStorage.removeItem('microsoft_sso_state');
        } else if (state === storedGoogleState) {
          provider = 'google';
          sessionStorage.removeItem('google_sso_state');
        }
        
        if (provider) {
          try {
            // Use window.location.origin for redirect URI - never hardcode
            const redirectUri = window.location.origin + '/auth/callback';
            
            const response = await axios.post(`${API}/auth/sso/${provider}/callback`, {
              code,
              state,
              redirect_uri: redirectUri
            });
            
            if (response.data.demo_mode) {
              toast.info(response.data.message || `Signed in with ${provider} (Demo Mode)`);
            } else {
              toast.success(`Successfully signed in with ${provider === 'microsoft' ? 'Microsoft' : 'Google'}!`);
            }
            
            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
            
            onLogin(response.data.access_token, response.data.user);
          } catch (error) {
            toast.error(error.response?.data?.detail || `${provider} sign-in failed`);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }
    };
    
    handleSSOCallback();
  }, [onLogin]);

  // SSO Sign-in handlers
  const handleMicrosoftSignIn = async () => {
    setSsoLoading({ ...ssoLoading, microsoft: true });
    try {
      // Use window.location.origin for redirect URI - never hardcode
      const redirectUri = window.location.origin + '/auth/callback';
      
      const response = await axios.get(`${API}/auth/sso/microsoft/url`, {
        params: { redirect_uri: redirectUri }
      });
      
      // Store state for callback verification
      sessionStorage.setItem('microsoft_sso_state', response.data.state);
      
      if (response.data.demo_mode) {
        toast.info('Microsoft SSO is in demo mode. Proceeding with demo authentication.');
      }
      
      // Redirect to Microsoft auth URL
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initiate Microsoft sign-in');
      setSsoLoading({ ...ssoLoading, microsoft: false });
    }
  };

  const handleGoogleSignIn = async () => {
    setSsoLoading({ ...ssoLoading, google: true });
    try {
      // Use window.location.origin for redirect URI - never hardcode
      const redirectUri = window.location.origin + '/auth/callback';
      
      const response = await axios.get(`${API}/auth/sso/google/url`, {
        params: { redirect_uri: redirectUri }
      });
      
      // Store state for callback verification
      sessionStorage.setItem('google_sso_state', response.data.state);
      
      if (response.data.demo_mode) {
        toast.info('Google SSO is in demo mode. Proceeding with demo authentication.');
      }
      
      // Redirect to Google auth URL
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initiate Google sign-in');
      setSsoLoading({ ...ssoLoading, google: false });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      
      // Check if 2FA is required
      if (response.data.requires_2fa) {
        setPendingLoginData(response.data);
        setShow2FAModal(true);
        setLoading(false);
        return;
      }
      
      // Handle Remember Me
      if (rememberMe) {
        localStorage.setItem('remembered_email', loginData.email);
      } else {
        localStorage.removeItem('remembered_email');
      }
      
      toast.success('Login successful!');
      onLogin(response.data.access_token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  // Handle 2FA verification
  const handle2FAVerify = async () => {
    if (twoFactorCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/verify-2fa`, {
        email: loginData.email,
        code: twoFactorCode,
        temp_token: pendingLoginData?.temp_token
      });
      
      if (rememberMe) {
        localStorage.setItem('remembered_email', loginData.email);
      }
      
      toast.success('Login successful!');
      setShow2FAModal(false);
      setTwoFactorCode('');
      onLogin(response.data.access_token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid verification code');
    }
    setLoading(false);
  };

  // Apple Sign In Handler
  const handleAppleSignIn = async () => {
    setSsoLoading({ ...ssoLoading, apple: true });
    toast.info('Apple Sign In coming soon! Use Microsoft or Google for now.');
    setTimeout(() => setSsoLoading({ ...ssoLoading, apple: false }), 1000);
  };

  // LinkedIn Sign In Handler
  const handleLinkedInSignIn = async () => {
    setSsoLoading({ ...ssoLoading, linkedin: true });
    toast.info('LinkedIn Sign In coming soon! Use Microsoft or Google for now.');
    setTimeout(() => setSsoLoading({ ...ssoLoading, linkedin: false }), 1000);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, registerData);
      toast.success('Registration successful!');
      onLogin(response.data.access_token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: resetEmail });
      toast.success('Reset code sent! Check your email.');
      setForgotPasswordStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reset code');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        email: resetEmail,
        code: resetCode,
        new_password: newPassword
      });
      toast.success('Password reset successful!');
      setForgotPasswordStep(3);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    }
    setLoading(false);
  };

  const resetForgotPassword = () => {
    setForgotPasswordMode(false);
    setForgotPasswordStep(1);
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Forgot Password UI
  if (forgotPasswordMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-100 p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-100">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
              {forgotPasswordStep === 1 && <Mail className="w-8 h-8 text-primary" />}
              {forgotPasswordStep === 2 && <KeyRound className="w-8 h-8 text-primary" />}
              {forgotPasswordStep === 3 && <CheckCircle2 className="w-8 h-8 text-emerald-600" />}
            </div>
            <CardTitle className="text-2xl font-manrope text-primary">
              {forgotPasswordStep === 1 && 'Forgot Password'}
              {forgotPasswordStep === 2 && 'Enter Reset Code'}
              {forgotPasswordStep === 3 && 'Password Reset!'}
            </CardTitle>
            <CardDescription className="text-slate-600">
              {forgotPasswordStep === 1 && "Enter your email and we'll send you a reset code"}
              {forgotPasswordStep === 2 && "Enter the 6-digit code sent to your email"}
              {forgotPasswordStep === 3 && "Your password has been successfully reset"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forgotPasswordStep === 1 && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    data-testid="forgot-email-input"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="send-code-button">
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={resetForgotPassword}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </form>
            )}

            {forgotPasswordStep === 2 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>Reset Code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={resetCode}
                      onChange={(value) => setResetCode(value)}
                      data-testid="reset-code-input"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <p className="text-xs text-center text-slate-500 mt-2">
                    Code sent to {resetEmail}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="new-password-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="confirm-password-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || resetCode.length !== 6}
                  data-testid="reset-password-button"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setForgotPasswordStep(1)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={handleForgotPassword}
                    disabled={loading}
                  >
                    Resend Code
                  </Button>
                </div>
              </form>
            )}

            {forgotPasswordStep === 3 && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <p className="text-slate-600">
                    You can now login with your new password.
                  </p>
                </div>
                <Button className="w-full" onClick={resetForgotPassword} data-testid="back-to-login-button">
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-100 p-4 sm:p-6"
      role="main"
      aria-label="Login page"
    >
      {/* Security Indicator - Top Banner */}
      <div className="flex items-center gap-2 mb-4 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
        <span className="font-medium">Secure Login</span>
        <Lock className="w-3 h-3" aria-hidden="true" />
      </div>

      <Card 
        className="w-full max-w-md shadow-xl border-slate-100 focus-within:ring-2 focus-within:ring-primary/20" 
        data-testid="login-card"
      >
        <CardHeader className="space-y-3 text-center pb-4 sm:pb-6">
          <div className="mx-auto flex flex-col items-center mb-2">
            <img 
              src="/procare-logo.png" 
              alt="ProCare Hub" 
              className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
            />
          </div>
          <CardDescription className="text-slate-600 text-sm sm:text-base">NDIS Provider Management Platform</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6" aria-label="Login or Register">
              <TabsTrigger 
                value="login" 
                data-testid="login-tab"
                className="text-sm sm:text-base focus-visible:ring-2 focus-visible:ring-primary"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                data-testid="register-tab"
                className="text-sm sm:text-base focus-visible:ring-2 focus-visible:ring-primary"
              >
                Register
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4" aria-label="Login form">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    data-testid="login-email-input"
                    type="email"
                    placeholder="coordinator@procare.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    autoComplete="email"
                    aria-required="true"
                    className="h-11 text-base focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-slate-700 font-medium">
                      Password
                    </Label>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                      onClick={() => setForgotPasswordMode(true)}
                      data-testid="forgot-password-link"
                      aria-label="Forgot your password? Click to reset"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    data-testid="login-password-input"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    autoComplete="current-password"
                    aria-required="true"
                    className="h-11 text-base focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                
                {/* Remember Me Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember-me" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked)}
                    data-testid="remember-me-checkbox"
                    aria-describedby="remember-me-description"
                    className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label 
                    htmlFor="remember-me" 
                    className="text-sm text-slate-600 cursor-pointer select-none"
                    id="remember-me-description"
                  >
                    Remember me on this device
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium btn-animated transition-all duration-200"
                  disabled={loading}
                  data-testid="login-submit-button"
                  aria-busy={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span className="animate-pulse">Signing in...</span>
                    </span>
                  ) : (
                    'Login'
                  )}
                </Button>
              </form>
              
              {/* SSO Sign-in Options */}
              <div className="mt-6" role="group" aria-label="Organization sign-in options">
                {/* Biometric Login */}
                {biometricAvailable && (
                  <div className="mb-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-3 h-12 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-all duration-200"
                      onClick={handleBiometricLogin}
                      disabled={biometricLoading}
                      data-testid="biometric-login-button"
                      aria-label="Sign in with fingerprint or face recognition"
                    >
                      <Fingerprint className="w-5 h-5" />
                      <span className="font-medium">
                        {biometricLoading ? 'Authenticating...' : 'Sign in with Biometrics'}
                      </span>
                    </Button>
                    <p className="text-xs text-center text-slate-500 mt-1">
                      Use fingerprint or face recognition
                    </p>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-slate-500 flex items-center gap-1.5 font-medium">
                      <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Sign in with your organization
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {/* Microsoft SSO Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center justify-center gap-2 h-11 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
                    onClick={handleMicrosoftSignIn}
                    disabled={ssoLoading.microsoft}
                    data-testid="microsoft-sso-button"
                    aria-label="Sign in with Microsoft"
                  >
                    <MicrosoftIcon className="flex-shrink-0" />
                    <span className="text-slate-700 font-medium text-sm hidden sm:inline">
                      {ssoLoading.microsoft ? '...' : 'Microsoft'}
                    </span>
                  </Button>
                  
                  {/* Google SSO Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center justify-center gap-2 h-11 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
                    onClick={handleGoogleSignIn}
                    disabled={ssoLoading.google}
                    data-testid="google-sso-button"
                    aria-label="Sign in with Google"
                  >
                    <GoogleIcon className="flex-shrink-0" />
                    <span className="text-slate-700 font-medium text-sm hidden sm:inline">
                      {ssoLoading.google ? '...' : 'Google'}
                    </span>
                  </Button>
                  
                  {/* Apple SSO Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center justify-center gap-2 h-11 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
                    onClick={handleAppleSignIn}
                    disabled={ssoLoading.apple}
                    data-testid="apple-sso-button"
                    aria-label="Sign in with Apple"
                  >
                    <AppleIcon className="flex-shrink-0" />
                    <span className="text-slate-700 font-medium text-sm hidden sm:inline">
                      {ssoLoading.apple ? '...' : 'Apple'}
                    </span>
                  </Button>
                  
                  {/* LinkedIn SSO Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center justify-center gap-2 h-11 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
                    onClick={handleLinkedInSignIn}
                    disabled={ssoLoading.linkedin}
                    data-testid="linkedin-sso-button"
                    aria-label="Sign in with LinkedIn"
                  >
                    <LinkedInIcon className="flex-shrink-0" />
                    <span className="text-slate-700 font-medium text-sm hidden sm:inline">
                      {ssoLoading.linkedin ? '...' : 'LinkedIn'}
                    </span>
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4" aria-label="Registration form">
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="text-slate-700 font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="register-name"
                    data-testid="register-name-input"
                    type="text"
                    placeholder="John Smith"
                    value={registerData.full_name}
                    onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                    required
                    autoComplete="name"
                    aria-required="true"
                    className="h-11 text-base focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-slate-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="register-email"
                    data-testid="register-email-input"
                    type="email"
                    placeholder="coordinator@procare.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    required
                    autoComplete="email"
                    aria-required="true"
                    className="h-11 text-base focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-slate-700 font-medium">
                    Password
                  </Label>
                  <Input
                    id="register-password"
                    data-testid="register-password-input"
                    type="password"
                    placeholder="••••••••"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    required
                    autoComplete="new-password"
                    aria-required="true"
                    minLength={8}
                    className="h-11 text-base focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  {/* Password Strength Indicator */}
                  <PasswordStrengthIndicator password={registerData.password} />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={loading}
                  data-testid="register-submit-button"
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Privacy & Terms Footer */}
      <div className="mt-6 text-center text-xs sm:text-sm text-slate-500">
        <p className="mb-2">
          By signing in, you agree to our{' '}
          <a 
            href="#privacy" 
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded inline-flex items-center gap-1"
            onClick={(e) => {
              e.preventDefault();
              toast.info('Privacy Policy: Your data is securely stored and never shared with third parties without consent.');
            }}
            aria-label="View Privacy Policy"
          >
            Privacy Policy
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
          {' '}and{' '}
          <a 
            href="#terms" 
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded inline-flex items-center gap-1"
            onClick={(e) => {
              e.preventDefault();
              toast.info('Terms of Service: Use of ProCare Hub is subject to NDIS provider regulations and our service agreement.');
            }}
            aria-label="View Terms of Service"
          >
            Terms of Service
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </p>
        <p className="text-slate-400 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" aria-hidden="true" />
          256-bit SSL encrypted connection
        </p>
      </div>

      {/* 2FA Verification Modal */}
      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit code from your authenticator app to complete sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <InputOTP 
                maxLength={6} 
                value={twoFactorCode} 
                onChange={(value) => setTwoFactorCode(value)}
                data-testid="2fa-code-input"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-xs text-center text-slate-500">
              Open your authenticator app (Google Authenticator, Microsoft Authenticator, etc.) and enter the code shown.
            </p>
            <Button 
              onClick={handle2FAVerify} 
              className="w-full" 
              disabled={loading || twoFactorCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-slate-500"
              onClick={() => {
                setShow2FAModal(false);
                setTwoFactorCode('');
                setPendingLoginData(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
