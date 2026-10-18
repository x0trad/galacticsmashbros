export function generationError(status: number, code?: string) {
  if (code === 'billing_not_active' || code === 'insufficient_quota') return 'Image generation is unavailable until API billing is active.';
  if (status === 401) return 'The image service credential needs to be updated.';
  if (status === 403 || code === 'model_not_found') return 'Image generation access is not enabled for this API project.';
  if (code === 'moderation_blocked' || code === 'content_policy_violation') return 'This artwork could not be processed. Please choose another image.';
  if (status === 429) return 'The image service is busy. Wait a moment, then retry this step.';
  return 'The image service could not finish this step. Your completed artwork is still available; please retry.';
}
