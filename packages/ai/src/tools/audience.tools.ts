export const audienceTools = [
  {
    name: 'fetch_audience_demographics',
    description: 'Retrieves audience demographic distribution and follower growth velocity.',
    execute: async (params: { brandId: string }) => ({ status: 'success', data: { brandId: params.brandId } }),
  },
];
