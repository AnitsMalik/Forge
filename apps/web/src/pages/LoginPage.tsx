import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Mail,
  Sparkles,
  Building2,
  ShieldCheck,
  ArrowRight,
  Sun,
  Moon,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Check,
  X,
  Shield,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { api } from '../services/api.js';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'verify';

interface LoginPageProps {
  initialMode?: AuthMode;
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialMode = 'login' }) => {
  const { login, register, sendSignupOtp, verifyOtpAndRegister, forgotPassword, resetPassword, verifyEmail, resendVerification } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [agencySlug, setAgencySlug] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  // 6-Digit Email OTP registration flow
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [devOtpSnippet, setDevOtpSnippet] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Selected Plan from Pricing Page redirect (/register?plan=growth&interval=year)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');

  // Read URL query params on mount for 1-click password reset or email verify links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    const interval = params.get('interval') === 'year' ? 'year' : 'month';
    if (plan) {
      setSelectedPlanId(plan);
      setSelectedInterval(interval);
      setMode('register');
    }
    const urlResetToken = params.get('resetToken') || params.get('token');
    const urlVerifyToken = params.get('verifyToken');

    if (urlVerifyToken) {
      setVerifyToken(urlVerifyToken);
      setMode('verify');
      // Auto-trigger verification if token in URL
      handleAutoVerify(urlVerifyToken);
    } else if (urlResetToken && window.location.search.includes('mode=reset')) {
      setResetToken(urlResetToken);
      setMode('reset');
    }
  }, []);

  const handleAutoVerify = async (tok: string) => {
    setLoading(true);
    setError(null);
    try {
      await verifyEmail(tok);
      setSuccessMessage('Your email address has been verified! You can now sign in.');
    } catch (err: any) {
      setError(err.message || 'Verification link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    const checks = {
      length: pass.length >= 8,
      lower: /[a-z]/.test(pass),
      upper: /[A-Z]/.test(pass),
      number: /\d/.test(pass),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass),
    };

    if (checks.length) score++;
    if (checks.lower) score++;
    if (checks.upper) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    let label = 'Too Weak';
    let color = '#ef4444';
    if (score >= 4) {
      label = 'Strong';
      color = '#10b981';
    } else if (score === 3) {
      label = 'Good';
      color = '#f59e0b';
    } else if (score === 2) {
      label = 'Fair';
      color = '#fbbf24';
    }

    return { score, label, color, checks };
  };

  const strength = getPasswordStrength(password);

  // Auto-slugify agency name
  const handleAgencyNameChange = (val: string) => {
    setAgencyName(val);
    if (!agencySlug || agencySlug === agencyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
      setAgencySlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (clean.length > 1) {
      const chars = clean.split('').slice(0, 6);
      chars.forEach((c, idx) => {
        if (index + idx < 6) newDigits[index + idx] = c;
      });
      setOtpDigits(newDigits);
      const nextFocus = Math.min(index + clean.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    newDigits[index] = clean;
    setOtpDigits(newDigits);

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);
    const nextIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIdx]?.focus();
  };

  const handleResendSignupOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sendSignupOtp({ email, agencySlug });
      setResendCooldown(60);
      if (res.devOtp) {
        setDevOtpSnippet(res.devOtp);
      }
      setSuccessMessage('A fresh 6-digit verification code has been dispatched to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'login') {
        await login(email, password);
        window.history.pushState({}, '', '/?tab=dashboard');
        window.location.href = '/?tab=dashboard';
      } else if (mode === 'register') {
        if (registerStep === 'form') {
          if (!fullName.trim() || !agencyName.trim() || !agencySlug.trim() || !email.trim()) {
            throw new Error('Please fill in all required fields.');
          }
          if (!strength.checks.length || !strength.checks.lower || !strength.checks.upper || !strength.checks.number) {
            throw new Error('Password does not meet the minimum security requirements.');
          }
          const res = await sendSignupOtp({ email, agencySlug });
          setRegisterStep('otp');
          setResendCooldown(res.expiresInSeconds ? Math.min(res.expiresInSeconds, 60) : 60);
          if (res.devOtp) {
            setDevOtpSnippet(res.devOtp);
          }
          setSuccessMessage(`A 6-digit verification code has been dispatched to ${email}. Please enter it below to complete registration.`);
          setTimeout(() => {
            otpInputRefs.current[0]?.focus();
          }, 100);
        } else {
          // registerStep === 'otp'
          const code = otpDigits.join('').trim();
          if (code.length !== 6) {
            throw new Error('Please enter the complete 6-digit verification code.');
          }
          await verifyOtpAndRegister({
            email,
            otp: code,
            fullName,
            password,
            agencyName,
            agencySlug,
          });
          setSuccessMessage('Account verified successfully! Launching your portal...');
          setTimeout(() => {
            window.history.pushState({}, '', '/?tab=dashboard');
            window.location.href = '/?tab=dashboard';
          }, 600);
        }
      } else if (mode === 'forgot') {
        const res = await forgotPassword(email);
        setSuccessMessage(res.message);
        if (res.devResetToken) {
          setResetToken(res.devResetToken);
        }
      } else if (mode === 'reset') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        if (!strength.checks.length || !strength.checks.lower || !strength.checks.upper || !strength.checks.number) {
          throw new Error('Password does not meet the minimum security requirements.');
        }
        await resetPassword(resetToken, password);
        setSuccessMessage('Password successfully updated! Please sign in with your new password.');
        setTimeout(() => {
          setMode('login');
          setSuccessMessage(null);
        }, 2000);
      } else if (mode === 'verify') {
        await verifyEmail(verifyToken);
        setSuccessMessage('Email verified successfully! You may now sign in.');
        setTimeout(() => {
          setMode('login');
          setSuccessMessage(null);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleResendVerification = async () => {
    if (!email) {
      setError('Please provide an email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resendVerification(email);
      setSuccessMessage('A fresh verification link has been sent to your email.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const planDetails: Record<string, { name: string; priceText: string }> = {
    starter: {
      name: 'Starter',
      priceText: selectedInterval === 'year' ? '$49/mo (billed $588/yr)' : '$59/month',
    },
    growth: {
      name: 'Growth',
      priceText: selectedInterval === 'year' ? '$79/mo (billed $948/yr)' : '$99/month',
    },
    agency: {
      name: 'Agency Pro',
      priceText: selectedInterval === 'year' ? '$199/mo (billed $2,388/yr)' : '$249/month',
    },
    scale: {
      name: 'Scale',
      priceText: selectedInterval === 'year' ? '$399/mo (billed $4,788/yr)' : '$499/month',
    },
  };
  const selectedPlanInfo = selectedPlanId ? planDetails[selectedPlanId] : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 60%), var(--bg-canvas)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        position: 'relative',
      }}
    >
      {/* Theme Toggle Top Right */}
      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={theme === 'dark' ? 'Switch to White Theme' : 'Switch to Dark Theme'}
        >
          <div className="theme-toggle-indicator">
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </div>
          <span>{theme === 'dark' ? 'White Theme' : 'Dark Theme'}</span>
        </button>
      </div>

      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: mode === 'register' ? '480px' : '440px',
          padding: '36px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/logo.svg" alt="HoaspForge Logo" style={{ width: '46px', height: '46px', margin: '0 auto 10px' }} />
          <h2 style={{ fontSize: '1.7rem', background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            HoaspForge
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {mode === 'login' && 'Sign in to access your multi-brand agency portal'}
            {mode === 'register' && (registerStep === 'otp' ? 'Verify your email address with the 6-digit security code' : 'Sign up for a new agency account')}
            {mode === 'forgot' && 'Reset your agency password'}
            {mode === 'reset' && 'Create your new strong password'}
            {mode === 'verify' && 'Confirm your email address'}
          </p>
        </div>

        {/* Mode Selector Tabs (Sign In / Register) */}
        {(mode === 'login' || mode === 'register') && (
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 'var(--radius-md)',
              padding: '3px',
              marginBottom: '22px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setRegisterStep('form');
                setError(null);
                setSuccessMessage(null);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: mode === 'login' ? 'var(--accent-primary)' : 'transparent',
                color: mode === 'login' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setRegisterStep('form');
                setError(null);
                setSuccessMessage(null);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: mode === 'register' ? 'var(--accent-primary)' : 'transparent',
                color: mode === 'register' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Selected Plan Banner (from Pricing Page / Direct Selection) */}
        {mode === 'register' && selectedPlanInfo && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              marginBottom: '20px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedPlanInfo.name} Plan • 14-Day Free Evaluation
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {selectedPlanInfo.priceText}
              </div>
            </div>
            <a
              href="/pricing"
              style={{
                fontSize: '0.75rem',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Change
            </a>
          </div>
        )}

        {/* Status Alerts */}
        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#fb7185',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              fontSize: '0.84rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.84rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* STEP 2 OF REGISTER: 6-DIGIT OTP VERIFICATION SCREEN */}
          {mode === 'register' && registerStep === 'otp' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Smartphone size={20} color="var(--accent-primary)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Check your inbox
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Enter the 6-digit code sent to <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong>
                  </div>
                </div>
              </div>

              {/* 6 OTP Digit Inputs */}
              <div>
                <label className="form-label" style={{ textAlign: 'center', display: 'block', marginBottom: '8px' }}>
                  6-Digit Verification Code
                </label>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }} onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpInputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={idx === 0 ? 6 : 1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      style={{
                        width: '46px',
                        height: '54px',
                        textAlign: 'center',
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-md)',
                        border: digit ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        boxShadow: digit ? '0 0 12px rgba(139, 92, 246, 0.3)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Dev Code Autofill Chip (shown when dev token returned in dev/testing) */}
              {devOtpSnippet && (
                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = devOtpSnippet.split('').slice(0, 6);
                      setOtpDigits(digits);
                      otpInputRefs.current[5]?.focus();
                    }}
                    style={{
                      background: 'rgba(139, 92, 246, 0.12)',
                      border: '1px dashed var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Development Mode: Auto-fill Code ({devOtpSnippet})
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={loading || otpDigits.join('').length !== 6}
              >
                <ShieldCheck size={16} />
                <span>{loading ? 'Verifying...' : 'Verify & Launch Portal'}</span>
                <ArrowRight size={16} />
              </button>

              {/* Resend and Edit details actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterStep('form');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <ArrowLeft size={13} />
                  <span>Edit details</span>
                </button>

                <div>
                  {resendCooldown > 0 ? (
                    <span style={{ color: 'var(--text-muted)' }}>Resend code in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendSignupOtp}
                      disabled={loading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0,
                      }}
                    >
                      <RefreshCw size={12} />
                      <span>Resend Code</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Mode: REGISTER Step 1 Specific Fields */}
              {mode === 'register' && (
                <>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Full Name</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Connor"
                        className="form-input"
                        style={{ paddingLeft: '38px' }}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                      <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Agency Name</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          required
                          placeholder="Acme Agency"
                          className="form-input"
                          style={{ paddingLeft: '38px' }}
                          value={agencyName}
                          onChange={(e) => handleAgencyNameChange(e.target.value)}
                        />
                        <Building2 size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Agency Slug</label>
                      <input
                        type="text"
                        required
                        placeholder="acme-agency"
                        className="form-input"
                        value={agencySlug}
                        onChange={(e) => setAgencySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Address (Login, Register, Forgot) */}
              {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      placeholder="name@agency.com"
                      className="form-input"
                      style={{ paddingLeft: '38px' }}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>
              )}

              {/* Password Reset Token Input (Reset Mode) */}
              {mode === 'reset' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Password Reset Token</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      placeholder="Paste 64-char reset token"
                      className="form-input"
                      style={{ paddingLeft: '38px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value.trim())}
                    />
                    <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>
              )}

              {/* Email Verification Token Input (Verify Mode) */}
              {mode === 'verify' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Verification Token</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      placeholder="Enter email verification token"
                      className="form-input"
                      style={{ paddingLeft: '38px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                      value={verifyToken}
                      onChange={(e) => setVerifyToken(e.target.value.trim())}
                    />
                    <ShieldCheck size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>
              )}

              {/* Password (Login, Register, Reset) */}
              {(mode === 'login' || mode === 'register' || mode === 'reset') && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      {mode === 'reset' ? 'New Password' : 'Password'}
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setError(null); setSuccessMessage(null); }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative', marginTop: '6px' }}>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      className="form-input"
                      style={{ paddingLeft: '38px' }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>

                  {/* Password Strength Meter for Register and Reset */}
                  {(mode === 'register' || mode === 'reset') && password.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '6px' }}>
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            style={{
                              flex: 1,
                              height: '100%',
                              borderRadius: '2px',
                              background: step <= strength.score ? strength.color : 'rgba(255, 255, 255, 0.1)',
                              transition: 'all 0.2s ease',
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>Strength: <strong style={{ color: strength.color }}>{strength.label}</strong></span>
                        <span>Min 8 chars, mixed case & numbers</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password (Reset Mode) */}
              {mode === 'reset' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      className="form-input"
                      style={{ paddingLeft: '38px' }}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: '6px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={loading}
              >
                <span>
                  {loading && 'Processing...'}
                  {!loading && mode === 'login' && 'Sign In to Agency Portal'}
                  {!loading && mode === 'register' && 'Continue to Verification'}
                  {!loading && mode === 'forgot' && 'Send Password Reset Link'}
                  {!loading && mode === 'reset' && 'Set New Password'}
                  {!loading && mode === 'verify' && 'Verify Email Address'}
                </span>
                <ArrowRight size={16} />
              </button>
            </>
          )}
        </form>

        {/* Alternate Navigation Actions */}
        {mode === 'forgot' && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </button>
            {resetToken && (
              <div style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.78rem' }}
                >
                  Proceed to Reset Screen &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'reset' && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </button>
          </div>
        )}

        {mode === 'verify' && (
          <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={handleResendVerification}
              className="btn btn-secondary btn-sm"
              disabled={loading}
            >
              <RefreshCw size={13} />
              <span>Resend Verification Link</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer', marginTop: '6px' }}
            >
              Back to Sign In
            </button>
          </div>
        )}


      </div>
    </div>
  );
};
