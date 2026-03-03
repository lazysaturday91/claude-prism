/**
 * claude-prism — HTTP Webhook Dispatcher
 * Non-blocking fire-and-forget webhook notifications
 */

/**
 * Dispatch a webhook event to configured endpoints
 * @param {Object} config - Prism config with webhooks array
 * @param {string} event - Event name (e.g. 'compaction', 'session-end', 'batch-complete')
 * @param {Object} payload - Event payload data
 * @returns {Promise<void>}
 */
export async function dispatchWebhook(config, event, payload) {
  const webhooks = config.webhooks || [];
  if (webhooks.length === 0) return;

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    source: 'claude-prism',
    payload
  });

  const promises = [];

  for (const hook of webhooks) {
    // Filter by subscribed events
    if (hook.events && hook.events.length > 0 && !hook.events.includes(event)) {
      continue;
    }

    if (!hook.url) continue;

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'claude-prism-webhook/1.0',
      ...(hook.headers || {})
    };

    // Fire-and-forget with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const p = fetch(hook.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal
    })
      .catch(() => { /* silent fail — webhooks are best-effort */ })
      .finally(() => clearTimeout(timeoutId));

    promises.push(p);
  }

  await Promise.allSettled(promises);
}
