export const templateTools = [
  {
    name: 'apply_template_layout',
    description: 'Binds variable values into a predefined platform template layout.',
    execute: async (params: { templateId: string; variables: Record<string, unknown> }) => ({ status: 'success', templateId: params.templateId }),
  },
];
