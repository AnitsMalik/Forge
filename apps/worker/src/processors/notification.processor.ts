export * from './dunningProcessor.js';

export async function processNotificationJob(data: { recipient: string; template: string; params: Record<string, unknown> }) {
  console.log(`[Notification Processor] Sending notification to ${data.recipient}`);
  return { success: true };
}
