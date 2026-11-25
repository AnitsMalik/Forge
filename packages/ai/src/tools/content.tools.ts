export const contentTools = [
  {
    name: 'generate_post_copy',
    description: 'Generates multi-platform post variations tailored to brand kit voice.',
    execute: async (params: { prompt: string; brandKitId: string }) => ({ status: 'success', prompt: params.prompt }),
  },
];
