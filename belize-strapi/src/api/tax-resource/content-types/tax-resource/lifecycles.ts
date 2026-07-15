'use strict';

const { upsertDocInKB, deleteDocFromKB } = require('../../../../utils/botpressKb');

const TAX_RESOURCE_UID = 'api::tax-resource.tax-resource';

const POPULATE_FOR_KB = {
  tax_resource_categories: true,
  Tax_Resource_Attachments: true,
  Tax_Resource_Tags: true,
};

function getCount(raw: any): number {
  if (!raw) return 0;
  if (Array.isArray(raw)) return raw.length;
  if (Array.isArray(raw?.data)) return raw.data.length;
  if (raw?.data) return 1;
  if (Array.isArray(raw?.results)) return raw.results.length;
  if (raw?.results) return 1;
  if (typeof raw?.count === 'number') return raw.count;
  return 0;
}

async function fetchPublishedEntry(documentId?: string, locale?: string): Promise<any> {
  if (!documentId) return null;

  try {
    if (strapi.documents) {
      const doc = await strapi.documents(TAX_RESOURCE_UID).findOne({
        documentId,
        locale: locale || undefined,
        status: 'published',
        populate: POPULATE_FOR_KB,
      });
      if (doc?.publishedAt) return doc;
    }
  } catch (err: any) {
    strapi.log.error('[KB] Error loading published entry via documents API:', err.message);
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
    strapi.log.error('[KB] Error loading published entry via entityService:', err.message);
    return null;
  }
}

async function syncPublishedIfExists(result: any, action: string): Promise<boolean> {
  const publishedEntry = await fetchPublishedEntry(result?.documentId, result?.locale);

  if (!publishedEntry) {
    strapi.log.info(`[KB] No published version found on ${action}.`);
    return false;
  }

  strapi.log.info(
    `[KB] ${action} published relations: categories=${getCount(publishedEntry?.tax_resource_categories)} tags=${getCount(publishedEntry?.Tax_Resource_Tags)}`
  );

  await upsertDocInKB(publishedEntry);
  strapi.log.info(`[KB] Sync completed (${action}).`);
  return true;
}

module.exports = {
  async afterCreate(event: any) {
    const { result } = event;

    try {
      await syncPublishedIfExists(result, 'create');
    } catch (err: any) {
      strapi.log.error('[KB] Sync error on afterCreate:', err.message);
    }
  },

  async afterUpdate(event: any) {
    const { result } = event;

    try {
      await syncPublishedIfExists(result, 'update');
    } catch (err: any) {
      strapi.log.error('[KB] Sync error on afterUpdate:', err.message);
    }
  },

  async afterDelete(event: any) {
    const { result } = event;

    try {
      const synced = await syncPublishedIfExists(result, 'delete');
      if (!synced) {
        const anyPublished = await fetchPublishedEntry(result?.documentId);
        if (anyPublished) {
          await upsertDocInKB(anyPublished);
          strapi.log.info('[KB] Delete event removed one locale, but another locale is still published. Global delete skipped.');
          return;
        }

        await deleteDocFromKB(result);
        strapi.log.info('[KB] Delete sync completed (no published locales left).');
      } else {
        strapi.log.info('[KB] Delete event matched published replacement; delete skipped.');
      }
    } catch (err: any) {
      strapi.log.error('[KB] Delete sync error:', err.message);
    }
  },
};

export {};
