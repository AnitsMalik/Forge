import { Router } from 'express';
import {
  register,
  sendSignupOtp,
  verifyOtpAndRegister,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  me,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter.js';
import { EnterpriseSsoController } from '../controllers/enterpriseSso.controller.js';

export const authRouter = Router();

// 6-Digit Email OTP Sign Up flow
authRouter.post('/signup/send-otp', authRateLimiter, sendSignupOtp);
authRouter.post('/signup/verify-and-register', authRateLimiter, verifyOtpAndRegister);

// Protect public brute-force targets with authRateLimiter
authRouter.post('/register', authRateLimiter, register);
authRouter.post('/login', authRateLimiter, login);
authRouter.post('/logout', logout);
authRouter.post('/refresh', refreshToken);
authRouter.post('/forgot-password', passwordResetRateLimiter, forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.get('/verify-email', verifyEmail);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/resend-verification', resendVerification);
authRouter.get('/me', authenticate, me);

// Enterprise SSO & SAML Federation
authRouter.get('/sso/lookup', (req, res) => EnterpriseSsoController.lookupDomain(req, res));
authRouter.get('/sso/saml/:configId/metadata', (req, res) => EnterpriseSsoController.getSpMetadata(req, res));
authRouter.post('/sso/saml/:configId/acs', (req, res) => EnterpriseSsoController.handleSamlAcs(req, res));
