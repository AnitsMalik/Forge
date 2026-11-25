export const analyticsTools = [
  {
    name: 'query_performance_telemetry',
    description: 'Queries reach, impressions, and engagement metrics for posts.',
    execute: async (params: { brandId: string; dateRange: { from: string; to: string } }) => ({ status: 'success', data: [] }),
  },
];
