/* eslint-disable no-undef */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
/* eslint-enable no-undef */
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}
