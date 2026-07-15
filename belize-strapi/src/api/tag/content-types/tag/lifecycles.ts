'use strict';

const { upsertDocInKB } = require('../../../../utils/botpressKb');

async function fetchTagWithRelation(id: number | string): Promise<any> {
  try {
    return await strapi.entityService.findOne('api::tag.tag', id, {
      populate: {
        tax_resources: true,
        tax_resource: true,
      },
    });
  } catch (err) {
    strapi.log.error(`Error loading tag ${id}: ${err.message}`);
    return null;
  }
}

function relationToList(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (raw?.data) return [raw.data];
  if (Array.isArray(raw?.results)) return raw.results;
  if (raw?.results) return [raw.results];
  return [raw];
}

function getTaxResourceIdsFromTag(tag: any): Array<number | string> {
  const current = relationToList(tag?.tax_resources);
  const legacy = relationToList(tag?.tax_resource);

  const ids = [...current, ...legacy]
    .map((item: any) => item?.id ?? item?.documentId ?? null)
    .filter(Boolean);

  return [...new Set(ids)];
}

async function fetchTaxResourceForKb(id: number | string): Promise<any> {
  try {
    return await strapi.entityService.findOne('api::tax-resource.tax-resource', id, {
      populate: {
        tax_resource_categories: true,
        Tax_Resource_Attachments: true,
        Tax_Resource_Tags: true,
      },
    });
  } catch (err) {
    strapi.log.error(`Error loading tax-resource ${id}: ${err.message}`);
    return null;
  }
}

async function syncTaxResource(id: number | string | null | undefined) {
  if (!id) return;

  const resource = await fetchTaxResourceForKb(id);
  if (!resource) return;

  try {
    await upsertDocInKB(resource);
    strapi.log.info(`✅ [KB] Tax Resource ${id} synced from Tag lifecycle`);
  } catch (err) {
    strapi.log.error(`❌ [KB] Error syncing Tax Resource ${id} from Tag: ${err.message}`);
  }
}

module.exports = {
  async beforeUpdate(event: any) {
    const { where } = event.params || {};
    const tagId = where?.id;
    if (!tagId) return;

    const previousTag: any = await fetchTagWithRelation(tagId);
    event.state = event.state || {};
    event.state.previousTaxResourceIds = getTaxResourceIdsFromTag(previousTag);
  },

  async beforeDelete(event: any) {
    const { where } = event.params || {};
    const tagId = where?.id;
    if (!tagId) return;

    const previousTag: any = await fetchTagWithRelation(tagId);
    event.state = event.state || {};
    event.state.previousTaxResourceIds = getTaxResourceIdsFromTag(previousTag);
  },

  async afterCreate(event: any) {
    const { result } = event;
    const currentTag: any = await fetchTagWithRelation(result?.id);
    const ids = getTaxResourceIdsFromTag(currentTag);
    for (const id of ids) {
      await syncTaxResource(id);
    }
  },

  async afterUpdate(event: any) {
    const { result, state } = event;
    const previousIds = Array.isArray(state?.previousTaxResourceIds)
      ? state.previousTaxResourceIds
      : [];
    const currentTag: any = await fetchTagWithRelation(result?.id);
    const currentIds = getTaxResourceIdsFromTag(currentTag);

    const ids = [...new Set([...previousIds, ...currentIds].filter(Boolean))];
    for (const id of ids) {
      await syncTaxResource(id);
    }
  },

  async afterDelete(event: any) {
    const { state } = event;
    const previousIds = Array.isArray(state?.previousTaxResourceIds)
      ? state.previousTaxResourceIds
      : [];
    for (const id of previousIds) {
      await syncTaxResource(id);
    }
  },
};

export {};
