import { db } from '../db/connection.js';
import { VideoComposer } from '../engines/video/videoComposer.js';
import type { ReelRenderRequest } from '@socialforge/shared';

export async function processVideoRenderJob(jobData: ReelRenderRequest & { brandId: string }) {
  console.log(`[Worker] Executing video render job for Brand: ${jobData.brandId}`);

  const brand = await db('brands').where({ id: jobData.brandId }).first();
  if (!brand) {
    throw new Error(`Brand ${jobData.brandId} not found`);
  }

  const result = await VideoComposer.renderReel(jobData, {
    id: brand.id,
    name: brand.name,
  });

  // Save to media_assets
  await db('media_assets').insert({
    id: result.assetId,
    tenant_id: brand.tenant_id,
    brand_id: brand.id,
    storage_key: `videos/${result.fileName}`,
    public_url: result.publicUrl,
    thumbnail_url: result.thumbnailUrl,
    file_name: result.fileName,
    mime_type: 'video/mp4',
    file_size_bytes: result.fileSizeBytes,
    media_type: 'video',
    metadata: JSON.stringify({
      width: result.width,
      height: result.height,
      aspectRatio: '9:16',
      durationSec: result.durationSec,
      codec: result.codec,
      engineUsed: result.engineUsed,
      filtersApplied: result.filtersApplied,
      title: jobData.title,
      subtext: jobData.subtext,
      pipeline: 'SocialForge Worker FFmpeg Video Engine',
    }),
    created_at: new Date(),
  });

  console.log(`[Worker] ✓ Successfully rendered video asset: ${result.fileName}`);
  return result;
}
