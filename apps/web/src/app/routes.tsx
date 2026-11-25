export interface AppRoute {
  path: string;
  name: string;
  tab: string;
}

export const APP_ROUTES: AppRoute[] = [
  { path: '/dashboard', name: 'Dashboard', tab: 'dashboard' },
  { path: '/campaigns', name: 'Campaigns', tab: 'campaigns' },
  { path: '/studio', name: 'Content Studio', tab: 'studio' },
  { path: '/calendar', name: 'Calendar', tab: 'calendar' },
  { path: '/approvals', name: 'Approvals', tab: 'approvals' },
  { path: '/connections', name: 'Connect Hub', tab: 'channels' },
  { path: '/brands', name: 'Brand Kit', tab: 'brands' },
  { path: '/analytics', name: 'Analytics', tab: 'analytics' },
  { path: '/billing', name: 'Billing', tab: 'billing' },
  { path: '/team', name: 'Team', tab: 'team' },
];
