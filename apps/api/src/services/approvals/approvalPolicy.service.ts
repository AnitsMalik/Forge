export class ApprovalPolicyService {
  requiresApproval(brandSettings: any, postContext: any): boolean {
    return true;
  }
}

export const approvalPolicyService = new ApprovalPolicyService();
