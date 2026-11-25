export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface Campaign {
  id: string;
  tenantId: string;
  brandId: string;
  name: string;
  objective?: string;
  status: CampaignStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  budget?: number | null;
  targetMetrics?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
