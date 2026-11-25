/**
 * Publication Integrity Utilities
 * Ensures 'published' status strictly represents genuine, confirmed external publications.
 */

/**
 * Validates whether an external post ID represents a genuine platform publication.
 * Rejects:
 * - Empty / null / undefined / non-string values
 * - Simulated & mock prefixes (fb_post_*, mock_*, sb_*, fake_*, test_*, ig_container_*, ig_media_*, ig_*, sim_*, page_*)
 * - Internal test UUIDs / short UUIDs (e.g. bbcf26bd-197, 85ea5897-163, standard 36-char UUIDs)
 */
export function isRealExternalPostId(id: unknown): boolean {
  if (typeof id !== 'string' || !id.trim()) return false;
  const trimmed = id.trim();

  // Reject simulated/mock prefixes
  if (
    trimmed.startsWith('fb_post_') ||
    trimmed.startsWith('mock_') ||
    trimmed.startsWith('sb_') ||
    trimmed.startsWith('fake_') ||
    trimmed.startsWith('test_') ||
    trimmed.startsWith('ig_container_') ||
    trimmed.startsWith('ig_media_') ||
    trimmed.startsWith('ig_') ||
    trimmed.startsWith('page_') ||
    trimmed.startsWith('sim_')
  ) {
    return false;
  }

  // Reject short UUIDs (e.g. bbcf26bd-197 or 85ea5897-163)
  if (/^[a-f0-9]{8}-[a-f0-9]{3,4}$/i.test(trimmed)) {
    return false;
  }

  // Reject standard UUIDs (often used as dummy/mock identifiers)
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Checks if a remote post URL points to a mock, local, or sandbox environment.
 */
export function isSandboxUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('mock.') ||
    lower.includes('.local') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('sandbox') ||
    lower.includes('example.com')
  );
}

/**
 * Validates complete publication integrity across status, remote ID, and remote URL.
 */
export function isRealPublication(item: {
  status?: string | null;
  remote_post_id?: string | null;
  remote_post_url?: string | null;
}): boolean {
  if (!item || item.status !== 'published') return false;
  if (!isRealExternalPostId(item.remote_post_id)) return false;
  if (isSandboxUrl(item.remote_post_url)) return false;
  return true;
}
