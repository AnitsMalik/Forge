export const connectorTools = [
  {
    name: 'read_connector_data',
    description: 'Reads rows, files, or catalog items from a connected external service.',
    execute: async (params: { connectionId: string; resourceId: string }) => ({ status: 'success', items: [] }),
  },
];
