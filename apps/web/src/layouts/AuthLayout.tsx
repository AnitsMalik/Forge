import React from 'react';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="auth-layout min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full">{children}</div>
    </div>
  );
};
