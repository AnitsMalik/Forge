export const publishingTools = [
  {
    name: 'schedule_social_post',
    description: 'Enqueues a post for scheduling across connected social accounts.',
    execute: async (params: { postId: string; scheduledFor: string }) => ({ status: 'enqueued', postId: params.postId }),
  },
];
