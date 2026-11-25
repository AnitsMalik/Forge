import { z } from 'zod';

export const CreateConnectionSchema = z.object({
  provider: z.enum([
    'meta',
    'linkedin',
    'google-drive',
    'google-sheets',
    'excel',
    'shopify',
    'woocommerce',
    'hubspot',
    'salesforce',
  ]),
  brandId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Connection name is required'),
  authCode: z.string().optional(),
  redirectUri: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const SelectResourcesSchema = z.object({
  resourceIds: z.array(z.string()).min(1, 'At least one resource must be selected'),
});

export const ConnectionHealthCheckSchema = z.object({
  connectionId: z.string().uuid(),
});
