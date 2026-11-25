import React from 'react';
import { Sidebar } from '../components/navigation/Sidebar.js';
import { TopNav } from '../components/navigation/TopNav.js';

export interface AppLayoutProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ currentTab, onNavigate, children }) => {
  return (
    <div className="app-container">
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={onNavigate}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
      <div className="main-content">
        <TopNav
          onNewPostClick={() => onNavigate('studio')}
          isSidebarCollapsed={false}
          onToggleSidebar={() => {}}
          onNavigate={onNavigate}
        />
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
};
