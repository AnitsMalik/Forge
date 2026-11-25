import React from 'react';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="admin-layout min-h-screen bg-slate-900 text-white p-6">
      <header className="mb-6 border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold">HoaspForge Superadmin Governance</h2>
      </header>
      <main>{children}</main>
    </div>
  );
};
