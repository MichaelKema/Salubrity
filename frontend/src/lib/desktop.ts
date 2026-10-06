type DesktopApi = { core: { invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> } };
declare global { interface Window { __TAURI__?: DesktopApi } }
export function isDesktop() { return typeof window !== 'undefined' && !!window.__TAURI__; }
export async function desktopRequest(command: 'tracker_request' | 'food_search', args: Record<string, unknown>) {
  try { return await window.__TAURI__!.core.invoke<{ status: number; body: unknown }>(command, args); }
  catch (error) { throw new Error(typeof error === 'string' ? error : 'Your local nutrition service is unavailable. Close and reopen Salubrity.'); }
}
