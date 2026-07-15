/**
 * tax-resource controller
 */

import { factories } from '@strapi/strapi'
import { upsertDocInKB } from '../../../utils/botpressKb';

const TAX_RESOURCE_UID = 'api::tax-resource.tax-resource';
const POPULATE_FOR_KB = {
  tax_resource_categories: true,
  Tax_Resource_Attachments: true,
  Tax_Resource_Tags: true,
};

export default factories.createCoreController(TAX_RESOURCE_UID, ({ strapi }) => ({
  async syncAllToBotpress(ctx: any) {
    const configuredSecret = process.env.BOTPRESS_BULK_SYNC_SECRET;
    const requestSecret =
      ctx.request.headers['x-botpress-sync-secret'] ||
      ctx.request.body?.secret ||
      ctx.request.query?.secret;

    if (configuredSecret && requestSecret !== configuredSecret) {
      return ctx.unauthorized('Invalid sync secret');
    }

    const configuredPageSize = Number(process.env.BOTPRESS_BULK_SYNC_PAGE_SIZE);
    const pageSize = Number.isFinite(configuredPageSize) && configuredPageSize > 0
      ? configuredPageSize
      : 50;
    let start = 0;
    let scanned = 0;
    let processed = 0;
    let success = 0;
    let failed = 0;
    let skippedDraft = 0;
    const byLocale: Record<string, number> = {};
    const errors: Array<{ documentId: string; locale: string; error: string }> = [];
    const seen = new Set<string>();

    const fetchBatch = async (offset: number, limit: number): Promise<any[]> => {
      try {
        const rows = await strapi.db.query(TAX_RESOURCE_UID).findMany({
          select: ['id', 'documentId', 'locale', 'publishedAt', 'updatedAt'],
          orderBy: { updatedAt: 'desc' },
          offset,
          limit,
        });
        if (Array.isArray(rows) && rows.length > 0) return rows;
      } catch (err: any) {
        strapi.log.error(`[KB][bulk-sync] db.query fallback failed: ${err?.message}`);
      }

      const rows = await strapi.entityService.findMany(TAX_RESOURCE_UID, {
        sort: { updatedAt: 'desc' },
        populate: POPULATE_FOR_KB,
        start: offset,
        limit,
      });
      if (Array.isArray(rows)) return rows;
      return rows ? [rows] : [];
    };

    const resolvePublishedEntry = async (documentId?: string, locale?: string): Promise<any | null> => {
      if (!documentId) return null;

      if ((strapi as any).documents) {
        try {
          const doc = await (strapi as any).documents(TAX_RESOURCE_UID).findOne({
            documentId,
            locale: locale || undefined,
            status: 'published',
            populate: POPULATE_FOR_KB,
          });
          if (doc) return doc;
        } catch (err: any) {
          strapi.log.error(`[KB][bulk-sync] documents.findOne failed documentId=${documentId} locale=${locale}: ${err?.message}`);
        }
      }

      try {
        const rows = await strapi.entityService.findMany(TAX_RESOURCE_UID, {
          filters: {
            documentId: { $eq: documentId },
            ...(locale ? { locale: { $eq: locale } } : {}),
            publishedAt: { $notNull: true },
          },
          sort: { updatedAt: 'desc' },
          populate: POPULATE_FOR_KB,
          limit: 1,
        });
        if (Array.isArray(rows)) return rows[0] || null;
        return rows || null;
      } catch (err: any) {
        strapi.log.error(`[KB][bulk-sync] entityService published fallback failed documentId=${documentId} locale=${locale}: ${err?.message}`);
        return null;
      }
    };

    while (true) {
      const entries = await fetchBatch(start, pageSize);
      if (!entries.length) break;
      scanned += entries.length;

      for (const entry of entries) {
        const locale = (entry?.locale || 'default').toString();
        const documentId = (entry?.documentId || '').toString();
        const dedupeKey = `${documentId}::${locale}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const publishedEntry = await resolvePublishedEntry(documentId, locale);
        const entryToSync = publishedEntry || entry;

        processed += 1;

        try {
          await upsertDocInKB(entryToSync);
          success += 1;
          const syncedLocale = (entryToSync?.locale || locale || 'default').toString();
          byLocale[syncedLocale] = (byLocale[syncedLocale] || 0) + 1;
        } catch (err: any) {
          failed += 1;
          errors.push({
            documentId,
            locale,
            error: err?.message || 'Unknown error',
          });
          strapi.log.error(`[KB][bulk-sync] Failed documentId=${documentId} locale=${locale}: ${err?.message}`);
        }
      }

      if (entries.length < pageSize) break;
      start += entries.length;
    }

    strapi.log.info(`[KB][bulk-sync] Completed. processed=${processed}, success=${success}, failed=${failed}`);

    ctx.body = {
      success: failed === 0,
      message: 'Bulk Tax Resource sync to Botpress completed',
      scanned,
      processed,
      successCount: success,
      failedCount: failed,
      skippedDraftCount: skippedDraft,
      byLocale,
      errors,
    };
  },
}));
