// Storage helpers backed by Supabase Storage (public bucket).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './_core/env';

const BUCKET = 'uploads';

let _client: SupabaseClient | null = null;

function getStorageClient(): SupabaseClient {
  if (!ENV.supabaseProjectUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error(
      "Storage credentials missing: set SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  if (!_client) {
    _client = createClient(ENV.supabaseProjectUrl, ENV.supabaseServiceRoleKey);
  }
  return _client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getStorageClient();
  const key = normalizeKey(relKey);
  const body = typeof data === "string" ? Buffer.from(data) : data;

  const { error } = await client.storage.from(BUCKET).upload(key, body, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = client.storage.from(BUCKET).getPublicUrl(key);
  return { key, url: publicUrlData.publicUrl };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const client = getStorageClient();
  const key = normalizeKey(relKey);
  const { data } = client.storage.from(BUCKET).getPublicUrl(key);
  return { key, url: data.publicUrl };
}
