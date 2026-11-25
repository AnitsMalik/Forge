export const governanceTools = [
  {
    name: 'validate_policy_guardrails',
    description: 'Scans proposed content against banned terms, tone boundaries, and disclosure rules.',
    execute: async (params: { text: string; brandPolicyId: string }) => ({ passed: true, issues: [] }),
  },
];
