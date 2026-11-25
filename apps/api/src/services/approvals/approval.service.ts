export class ApprovalService {
  async listPendingApprovals(tenantId: string) {
    return [];
  }
}

export const approvalService = new ApprovalService();
