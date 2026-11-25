import React from 'react';
import { ThemeProvider } from '../../context/ThemeContext.js';
import { AuthProvider } from '../../context/AuthContext.js';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
};
