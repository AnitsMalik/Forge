import React from 'react';
import { LoginPage } from '../LoginPage.js';

export const ResetPassword: React.FC = () => {
  return <LoginPage initialMode="reset" />;
};

export default ResetPassword;
