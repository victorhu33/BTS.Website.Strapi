import type { Core } from '@strapi/strapi';
import { deleteDocFromKB, upsertDocInKB } from './utils/botpressKb';

const TAX_RESOURCE_UID = 'api::tax-resource.tax-resource';

const POPULATE_FOR_KB = {
  tax_resource_categories: true,
  Tax_Resource_Attachments: true,
  Tax_Resource_Tags: true,
};

async function fetchPublishedTaxResource(
  strapi: Core.Strapi,
  documentId?: string,
  locale?: string
): Promise<any> {
  if (!documentId) return null;

  try {
    if ((strapi as any).documents) {
      const doc = await (strapi as any).documents(TAX_RESOURCE_UID).findOne({
        documentId,
        locale: locale || undefined,
        status: 'published',
        populate: POPULATE_FOR_KB,
      });
      if (doc?.publishedAt) return doc;
    }
  } catch (err: any) {
    strapi.log.error(`[KB][bootstrap] documents findOne failed: ${err.message}`);
  }

  try {
    const rows = await (strapi as any).entityService.findMany(TAX_RESOURCE_UID, {
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
    strapi.log.error(`[KB][bootstrap] entityService findMany failed: ${err.message}`);
  }

  return null;
}

async function syncTaxResourceFromEvent(strapi: Core.Strapi, result: any, action: string) {
  const documentId = result?.documentId;
  const locale = result?.locale;

  if (!documentId) {
    strapi.log.info(`[KB][bootstrap] ${action}: missing documentId, skipping.`);
    return;
  }

  const published = await fetchPublishedTaxResource(strapi, documentId, locale);

  if (published) {
    await upsertDocInKB(published);
    strapi.log.info(
      `[KB][bootstrap] ${action}: synced published documentId=${documentId} locale=${locale || 'default'}.`
    );
    return;
  }

  if (action === 'delete') {
    const publishedInAnyLocale = await fetchPublishedTaxResource(strapi, documentId);
    if (publishedInAnyLocale) {
      await upsertDocInKB(publishedInAnyLocale);
      strapi.log.info(
        `[KB][bootstrap] delete: locale removed but documentId=${documentId} still has a published locale. Global delete skipped.`
      );
      return;
    }

    await deleteDocFromKB({ documentId });
    strapi.log.info(`[KB][bootstrap] delete: no published locales left, removed documentId=${documentId}.`);
    return;
  }

  strapi.log.info(
    `[KB][bootstrap] ${action}: no published version yet for documentId=${documentId}, waiting for publish.`
  );
}

export default {
  register() {},

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    if (process.env.KB_ENABLE_BOOTSTRAP_SUBSCRIBER !== 'true') {
      strapi.log.info('[BOOTSTRAP] KB sync subscriber disabled (using content-type lifecycles).');
      return;
    }

    strapi.log.info('[BOOTSTRAP] KB sync subscriber enabled for tax-resource.');

    strapi.db.lifecycles.subscribe({
      models: [TAX_RESOURCE_UID],

      async afterCreate(event: any) {
        try {
          await syncTaxResourceFromEvent(strapi, event?.result, 'create');
        } catch (err: any) {
          strapi.log.error(`[KB][bootstrap] afterCreate error: ${err.message}`);
        }
      },

      async afterUpdate(event: any) {
        try {
          await syncTaxResourceFromEvent(strapi, event?.result, 'update');
        } catch (err: any) {
          strapi.log.error(`[KB][bootstrap] afterUpdate error: ${err.message}`);
        }
      },

      async afterDelete(event: any) {
        try {
          await syncTaxResourceFromEvent(strapi, event?.result, 'delete');
        } catch (err: any) {
          strapi.log.error(`[KB][bootstrap] afterDelete error: ${err.message}`);
        }
      },
    });
  },
};
