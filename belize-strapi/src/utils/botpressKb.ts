import axios from "axios";

const KB_ID = process.env.BOTPRESS_KB_ID;
const BP_PAT = process.env.BOTPRESS_PAT;
const BOT_ID = process.env.BOTPRESS_BOT_ID;
const STRAPI_URL = (
  process.env.STRAPI_BASE_URL ||
  process.env.PUBLIC_URL ||
  (process.env.WEBSITE_HOSTNAME ? `https://${process.env.WEBSITE_HOSTNAME}` : "") ||
  `http://127.0.0.1:${process.env.PORT || "1337"}`
).replace(/\/$/, "");

function normalizeLocaleKey(locale?: string): string {
  if (!locale) return "DEFAULT";
  return locale.toUpperCase().replace(/-/g, "_");
}

function getTaxResourcePublicBaseUrl(locale?: string): string {
  const localeKey = normalizeLocaleKey(locale);
  const localeSpecific = process.env[`TAX_RESOURCE_PUBLIC_BASE_URL_${localeKey}`];
  const generic = process.env.TAX_RESOURCE_PUBLIC_BASE_URL;
  const fallback = "https://btsweb-staging.azurewebsites.net/tax_resources/";
  const base = (localeSpecific || generic || fallback).trim();
  return base.endsWith("/") ? base : `${base}/`;
}

function getLocaleTexts(locale?: string): {
  sourceLabel: string;
  attachmentLabel: string;
} {
  const normalized = (locale || "").toLowerCase();
  const isSpanish = normalized === "es" || normalized.startsWith("es-");

  if (isSpanish) {
    return {
      sourceLabel: "Información obtenida desde:",
      attachmentLabel: "El documento se encuentra aquí:"
    };
  }

  return {
    sourceLabel: "Information obtained from:",
    attachmentLabel: "The document is available here:"
  };
}

function toAbsoluteMediaUrl(rawUrl: string): string {
  if (!rawUrl) return `${STRAPI_URL}/`;
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  const normalizedPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  return `${STRAPI_URL}${normalizedPath}`;
}

function getCategoryLabel(entry: any): string {
  const raw = entry?.tax_resource_categories || entry?.Tax_Resource_Category;

  if (!raw) return "N/A";

  const toList = (value: any): any[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (value?.data) return [value.data];
    if (Array.isArray(value?.results)) return value.results;
    if (value?.results) return [value.results];
    return [value];
  };

  const extractName = (val: any): string | undefined => {
    if (!val) return undefined;
    let obj = val;
    if (obj.data) obj = obj.data;
    if (obj.attributes) obj = obj.attributes;
    return (
      obj.Tax_Resource_Category_Name ||
      obj.name ||
      obj.title ||
      obj.Title
    );
  };

  const parts = toList(raw)
      .map((v) => (typeof v === "string" ? v : extractName(v)))
      .filter(Boolean) as string[];
  return parts.length ? parts.join(", ") : "N/A";
}

function getTagLabels(entry: any): string[] {
  const raw = entry?.Tax_Resource_Tags;

  if (!raw) return [];

  const toList = (value: any): any[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (value?.data) return [value.data];
    if (Array.isArray(value?.results)) return value.results;
    if (value?.results) return [value.results];
    return [value];
  };

  const extractName = (val: any): string | undefined => {
    if (!val) return undefined;
    let obj = val;
    if (obj.data) obj = obj.data;
    if (obj.attributes) obj = obj.attributes;
    return obj.Tag_Name || obj.name || obj.title || obj.Title;
  };

  return toList(raw)
    .map((v) => (typeof v === "string" ? v : extractName(v)))
    .filter(Boolean) as string[];
}

const api = axios.create({
  baseURL: "https://api.botpress.cloud/v1",
  headers: {
    Authorization: `Bearer ${BP_PAT}`,
    "Content-Type": "application/json",
    "x-bot-id": BOT_ID
  }
});

async function hasAnyPublishedTaxResourceLocale(documentId: string): Promise<boolean> {
  if (!documentId) return false;

  try {
    const rows = await strapi.entityService.findMany('api::tax-resource.tax-resource', {
      filters: {
        documentId: { $eq: documentId },
        publishedAt: { $notNull: true },
      },
      fields: ['id'],
      limit: 1,
    });

    if (Array.isArray(rows)) return rows.length > 0;
    return Boolean(rows);
  } catch (err: any) {
    strapi.log.error(`❌ [KB] Error validating published locales for ${documentId}: ${err.message}`);
    return false;
  }
}

/**
 * Convierte el contenido del Tax Resource a markdown.
 */
export function toMarkdown(entry: any): string {
  const categoryLabel = getCategoryLabel(entry);
  const tags = getTagLabels(entry);
  const tagsLabel = tags.length ? tags.join(", ") : "N/A";
  const taxResourceId = entry?.Tax_Resource_ID || "";
  const locale = (entry?.locale || "").toString();
  const texts = getLocaleTexts(locale);
  const sourceUrl = taxResourceId
    ? `${getTaxResourcePublicBaseUrl(locale)}${taxResourceId}`
    : "";
  const summary = (entry.Tax_Resource_Summary || [])
    .map((p: any) => p.children?.map((c: any) => c.text).join("") || "")
    .join("\n\n");

  const body = (entry.Tax_Resource_Body || [])
    .map((p: any) => p.children?.map((c: any) => c.text).join("") || "")
    .join("\n\n");

  const attachmentLines = (entry?.Tax_Resource_Attachments || [])
    .map((file: any) => {
      if (!file?.url) return "";
      const absoluteUrl = toAbsoluteMediaUrl(file.url);
      if (!absoluteUrl) return "";
      return `${texts.attachmentLabel} ${absoluteUrl.replace("https://btsweb-strapi-staging.azurewebsites.net/", "https://media.bts.gov.bz/")}`;
      //return `${texts.attachmentLabel} ${absoluteUrl}`;
    })
    .filter(Boolean)
    .join("\n");

  const bodyWithLinks = [
    body,
    sourceUrl ? `${texts.sourceLabel} ${sourceUrl}` : "",
    attachmentLines
  ]
    .filter(Boolean)
    .join("\n\n");

  return `
# ${entry.Tax_Resource_Title}

**Category:** ${categoryLabel}  
**Tags:** ${tagsLabel}  
**Type:** ${entry.Tax_Resource_Type || "N/A"}  
**Effective Date:** ${entry.Tax_Resource_Effective_Date || "N/A"}  

---

## Summary
${summary}

---

## Body
${bodyWithLinks}
`;
}

/**
 * Lista archivos del bot con filtros opcionales
 */
async function listFiles(tags?: any) {
  try {
    // Listar archivos sin filtros de tags (el filtrado por tags da 400)
    const res = await api.get('/files');
    const allFiles = res.data.files || [];
    
    // Si hay tags, filtrar manualmente
    if (tags && allFiles.length > 0) {
      return allFiles.filter((file: any) => {
        if (!file.tags) return false;
        // Verificar si los tags coinciden
        return Object.keys(tags).every(key => file.tags[key] === tags[key]);
      });
    }
    
    return allFiles;
  } catch (err: any) {
    strapi.log.error(`Error listing files: ${err.message}`);
    return [];
  }
}

/**
 * Elimina un archivo de Botpress
 */
async function deleteFile(fileId: string) {
  try {
    await api.delete(`/files/${fileId}`);
    strapi.log.info(`🗑️ [KB] File deleted: ${fileId}`);
  } catch (err: any) {
    strapi.log.error(`Error deleting file ${fileId}: ${err.message}`);
  }
}

/**
 * Crea y sube un archivo de texto (Markdown) a Botpress usando PUT
 * El archivo se indexa automáticamente cuando se establece index: true
 */
async function createAndUploadMarkdown(
  markdown: string,
  externalId: string,
  locale: string,
  title: string,
  taxTags: string[] = []
) {
  try {
    const buffer = Buffer.from(markdown, 'utf-8');
    const key = `tax-resource/${externalId}.${locale}.md`;
    
    strapi.log.info(`📝 [KB] Creating file: ${key}`);
    
    // Paso 1: Crear el archivo usando PUT con index: true
    // IMPORTANTE: El archivo se asocia automáticamente a la KB cuando:
    // - Tiene index: true
    // - Pertenece al mismo bot (x-bot-id)
    // - Tiene el formato correcto (markdown, pdf, etc.)
    const createRes = await api.put('/files', {
      key: key,
      size: buffer.byteLength,
      tags: {
        externalId: externalId,
        source: "tax-resource",
        title: title,
        category: "markdown",
        locale: locale,
        taxTags: taxTags.join("|"),
        kbId: KB_ID // Añadir el KB_ID como tag para identificar
      },
      index: true, // Esto indexa automáticamente el archivo para búsqueda semántica
      accessPolicies: [] // Archivo privado por defecto
    });

    const { id, uploadUrl } = createRes.data.file;
    strapi.log.info(`✅ [KB] File created with ID: ${id}`);

    // Paso 2: Subir el contenido al uploadUrl
    strapi.log.info(`📤 [KB] Uploading content...`);
    await axios.put(uploadUrl, buffer, {
      headers: {
        'Content-Type': 'text/markdown'
      }
    });

    strapi.log.info(`✅ [KB] Content uploaded successfully`);
    strapi.log.info(`[KB] The file will be indexed automatically in the background`);
    return id;
  } catch (err: any) {
    strapi.log.error(`❌ Error creating/uploading markdown: ${err.message}`);
    if (err.response) {
      strapi.log.error(`Response data: ${JSON.stringify(err.response.data)}`);
    }
    throw err;
  }
}

/**
 * Subida de archivos adjuntos a KB (PDFs)
 */
async function uploadAttachment(strapiFile: any, externalId: string) {
  try {
    const fileUrl = toAbsoluteMediaUrl(strapiFile.url);
    strapi.log.info(`📎 [KB] Downloading attachment: ${fileUrl}`);
    
    const fileRes = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const fileBuffer = Buffer.from(fileRes.data);
    const key = `tax-resource/${externalId}/${strapiFile.name}`;

    strapi.log.info(`📝 [KB] Creating attachment file: ${key}`);
    const createRes = await api.put('/files', {
      key: key,
      size: fileBuffer.byteLength,
      tags: {
        externalId: externalId,
        source: "tax-resource",
        type: "attachment",
        filename: strapiFile.name,
        kbId: KB_ID
      },
      index: true, // Indexar automáticamente
      accessPolicies: []
    });

    const { id, uploadUrl } = createRes.data.file;
    strapi.log.info(`✅ [KB] Attachment file created with ID: ${id}`);

    strapi.log.info(`📤 [KB] Uploading attachment content...`);
    await axios.put(uploadUrl, fileBuffer, {
      headers: {
        'Content-Type': strapiFile.mime
      }
    });

    strapi.log.info(`✅ [KB] Attachment uploaded successfully`);
    strapi.log.info(`[KB] The PDF will be indexed automatically in the background`);
    return id;
  } catch (err: any) {
    strapi.log.error(`❌ Error uploading attachment ${strapiFile.name}: ${err.message}`);
    if (err.response) {
      strapi.log.error(`Response data: ${JSON.stringify(err.response.data)}`);
    }
    throw err;
  }
}

/**
 * UPSERT general (Markdown + PDFs)
 */
export async function upsertDocInKB(entry: any) {
  const externalId = entry.documentId;
  const locale = (entry?.locale || "default").toString();
  const normalizedLocale = locale.toLowerCase();
  const localeMarkdownKey = `tax-resource/${externalId}.${normalizedLocale}.md`;
  const legacyMarkdownKey = `tax-resource/${externalId}.md`;
  const taxTags = getTagLabels(entry);

  if (entry?.publishedAt === null) {
    strapi.log.info("[KB] Draft document -> Not synchronized");
    return;
  }

  try {
    // 1. Eliminar markdown del locale actual y adjuntos del documento
    strapi.log.info(`🧹 [KB] Looking for previous files for: ${externalId} (locale=${locale})`);
    const existingFiles = await listFiles({ 
      externalId: externalId,
      source: "tax-resource"
    });
    
    if (existingFiles.length > 0) {
      const filesToDelete = existingFiles.filter((file: any) => {
        const type = file?.tags?.type;
        const fileKey = (file?.key || "").toString().toLowerCase();
        const isMarkdownForLocaleByKey = fileKey === localeMarkdownKey || fileKey === legacyMarkdownKey;
        const isAttachment = type === "attachment";
        return isMarkdownForLocaleByKey || isAttachment;
      });
      strapi.log.info(`🗑️ [KB] Found ${filesToDelete.length} files to delete`);
      for (const file of filesToDelete) {
        await deleteFile(file.id);
      }
    } else {
      strapi.log.info(`ℹ️ [KB] No previous files were found`);
    }

    // 2. Crear y subir el Markdown
    const markdown = toMarkdown(entry);
    strapi.log.info("📤 [KB] Creating Markdown document...");
    await createAndUploadMarkdown(
      markdown,
      externalId,
      locale,
      entry.Tax_Resource_Title,
      taxTags
    );

    // 3. Subir PDFs adjuntos
    if (entry.Tax_Resource_Attachments?.length) {
      strapi.log.info(`📎 [KB] Processing ${entry.Tax_Resource_Attachments.length} attachments...`);
      for (const file of entry.Tax_Resource_Attachments) {
        try {
          await uploadAttachment(file, externalId);
        } catch (err) {
          strapi.log.error(`⚠️ Error with attachment ${file.name}, continuing...`);
        }
      }
    }
    strapi.log.info("[KB] Synchronization completed");
    strapi.log.info("[KB] Files will be indexed automatically in 1-2 minutes");
  } catch (err: any) {
    strapi.log.error(`[KB] Synchronization error: ${err.message}`);
    throw err;
  }
}

/**
 * Elimina todos los archivos relacionados con un documento
 */
export async function deleteDocFromKB(entry: any) {
  const externalId = entry.documentId;
  const locale = (entry?.locale || "").toString().toLowerCase();
  const localeMarkdownKey = locale ? `tax-resource/${externalId}.${locale}.md` : "";
  const legacyMarkdownKey = `tax-resource/${externalId}.md`;

  try {
    const hasPublishedInAnyLocale = await hasAnyPublishedTaxResourceLocale(externalId);
    const shouldDeleteAll = !hasPublishedInAnyLocale;

    strapi.log.info(`[KB] Deleting files for: ${externalId}`);
    const existingFiles = await listFiles({
      externalId: externalId,
      source: "tax-resource"
    });

    if (existingFiles.length > 0) {
      const filesToDelete = shouldDeleteAll
        ? existingFiles
        : existingFiles.filter((file: any) => {
            const fileKey = (file?.key || "").toString().toLowerCase();
            return fileKey === localeMarkdownKey || fileKey === legacyMarkdownKey;
          });

      for (const file of filesToDelete) {
        await deleteFile(file.id);
      }
      strapi.log.info(`[KB] ${filesToDelete.length} file(s) deleted`);
    } else {
      strapi.log.info(`[KB] No files found to delete`);
    }
  } catch (err: any) {
    strapi.log.error(`[KB] Error deleting files: ${err.message}`);
    throw err;
  }
}
