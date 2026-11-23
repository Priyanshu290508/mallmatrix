/**
 * MALLMATRIX — Public Platform Statistics Fetcher
 * Securely retrieves aggregate, non-sensitive platform metrics from Supabase RPC.
 * Used exclusively by the public landing page (landing.html).
 * Built with vanilla JavaScript fetch (no external libraries).
 */

const TIMEOUT_MS = 4000;

/**
 * Fetch public platform statistics from Supabase RPC get_public_stats.
 * Returns validated metrics or null on any failure.
 * 
 * @returns {Promise<{ storesTotal: number, skuCount: number, criticalCount: number, updatedAt: string } | null>}
 */
export async function fetchPublicStats() {
  const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
  const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey || typeof supabaseUrl !== 'string' || typeof anonKey !== 'string') {
    return null;
  }

  const cleanUrl = supabaseUrl.replace(/\/+$/, '');
  const rpcEndpoint = `${cleanUrl}/rest/v1/rpc/get_public_stats`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const response = await fetch(rpcEndpoint, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || typeof data !== 'object') {
      return null;
    }

    const storesTotal = Number(data.storesTotal);
    const skuCount = Number(data.skuCount);
    const criticalCount = Number(data.criticalCount);

    // Validate that every returned value is a non-negative number
    if (
      !Number.isFinite(storesTotal) || storesTotal < 0 ||
      !Number.isFinite(skuCount) || skuCount < 0 ||
      !Number.isFinite(criticalCount) || criticalCount < 0
    ) {
      return null;
    }

    return {
      storesTotal: Math.floor(storesTotal),
      skuCount: Math.floor(skuCount),
      criticalCount: Math.floor(criticalCount),
      updatedAt: data.updatedAt ? String(data.updatedAt) : new Date().toISOString()
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return null;
  }
}

