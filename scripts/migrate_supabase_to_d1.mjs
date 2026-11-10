/**
 * Standalone Migration Script: Supabase -> Cloudflare D1
 *
 * Cara menjalankan:
 *   node scripts/migrate_supabase_to_d1.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env or .env.local if present
function loadEnvFile(file) {
  if (!existsSync(file)) return;
  const content = readFileSync(file, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val.replace(/^["']|["']$/g, '');
      }
    }
  }
}

loadEnvFile(resolve(process.cwd(), '.env'));
loadEnvFile(resolve(process.cwd(), '.env.local'));

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!accountId || !databaseId || !apiToken) {
  console.error('❌ Error: Kredensial Cloudflare D1 belum lengkap di environment variable.');
  console.error('Pastikan CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, dan CLOUDFLARE_API_TOKEN telah disetel.');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Kredensial Supabase belum lengkap di environment variable.');
  console.error('Pastikan SUPABASE_URL (atau VITE_SUPABASE_URL) dan SUPABASE_ANON_KEY telah disetel.');
  process.exit(1);
}

async function queryD1(sql, params = []) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    const errMsg = data.errors?.[0]?.message || data.messages?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`D1 Error: ${errMsg}`);
  }
  return data.result?.[0]?.results || [];
}

async function main() {
  console.log('🚀 Memulai migrasi data dari Supabase ke Cloudflare D1...');

  // 1. Fetch from Supabase
  console.log('📡 Mengambil data penilaian dari Supabase...');
  const supaEndpoint = `${supabaseUrl}/rest/v1/cvss_reviews?select=*`;
  const supaRes = await fetch(supaEndpoint, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });

  if (!supaRes.ok) {
    const errText = await supaRes.text();
    throw new Error(`Gagal membaca dari Supabase (HTTP ${supaRes.status}): ${errText}`);
  }

  const rows = await supaRes.json();
  console.log(`📦 Ditemukan ${rows.length} record penilaian di Supabase.`);

  if (rows.length === 0) {
    console.log('ℹ️ Tidak ada data untuk dimigrasikan.');
    return;
  }

  // 2. Ensure D1 schema
  console.log('🛠️ Memeriksa & membuat tabel cvss_reviews di Cloudflare D1...');
  await queryD1(`
    CREATE TABLE IF NOT EXISTS cvss_reviews (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_role TEXT,
      version TEXT NOT NULL DEFAULT 'v2',
      av TEXT NOT NULL,
      ac TEXT NOT NULL,
      pr TEXT NOT NULL,
      ui TEXT NOT NULL,
      s TEXT NOT NULL,
      c TEXT NOT NULL,
      i TEXT NOT NULL,
      a TEXT NOT NULL,
      base_score REAL NOT NULL,
      severity TEXT NOT NULL,
      vector_string TEXT NOT NULL,
      justification TEXT,
      submitted_at TEXT NOT NULL
    );
  `);
  await queryD1('CREATE INDEX IF NOT EXISTS idx_cvss_reviews_case ON cvss_reviews(case_id);');
  await queryD1('CREATE INDEX IF NOT EXISTS idx_cvss_reviews_reviewer ON cvss_reviews(reviewer_name);');
  await queryD1('CREATE INDEX IF NOT EXISTS idx_cvss_reviews_version ON cvss_reviews(version);');

  // 3. Insert into D1
  console.log('💾 Menyalin record ke Cloudflare D1...');
  let migratedCount = 0;
  for (const r of rows) {
    const insertSql = `
      INSERT OR REPLACE INTO cvss_reviews (
        id, case_id, reviewer_name, reviewer_role, version,
        av, ac, pr, ui, s, c, i, a,
        base_score, severity, vector_string, justification, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      r.id || `v2_${r.case_id}_${encodeURIComponent((r.reviewer_name || '').trim().toLowerCase())}`,
      r.case_id,
      (r.reviewer_name || '').trim(),
      (r.reviewer_role || '').trim(),
      r.version || 'v2',
      r.av || 'N',
      r.ac || 'L',
      r.pr || 'N',
      r.ui || 'N',
      r.s || 'U',
      r.c || 'N',
      r.i || 'N',
      r.a || 'N',
      Number(r.base_score || 0),
      r.severity || 'NONE',
      r.vector_string || '',
      r.justification || '',
      r.submitted_at || new Date().toISOString()
    ];

    await queryD1(insertSql, params);
    migratedCount++;
  }

  console.log(`✅ Sukses! ${migratedCount} record berhasil disalin ke Cloudflare D1.`);
  console.log('🔒 Data asli di Supabase tetap aman dan tidak dihapus.');
}

main().catch(err => {
  console.error('❌ Terjadi kesalahan saat migrasi:', err.message);
  process.exit(1);
});

