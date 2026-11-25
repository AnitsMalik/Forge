import React from 'react';
import { LoginPage } from '../LoginPage.js';

export const ForgotPassword: React.FC = () => {
  return <LoginPage initialMode="forgot" />;
};

export default ForgotPassword;
