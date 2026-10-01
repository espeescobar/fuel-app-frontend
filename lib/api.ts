export function getBackendUrl() {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base) return "http://localhost:3001";
  return base;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOpts } = opts;
  
  // 1. Creamos un objeto de headers limpio
  const headers: Record<string, string> = {};

  // 2. Solo agregamos JSON si NO es FormData
  if (!(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // 3. Agregamos el token si existe
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // 4. Mezclamos con otros headers que puedan venir en opts
  const finalHeaders = {
    ...headers,
    ...(opts.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${getBackendUrl()}${path}`, {
    ...fetchOpts,
    headers: finalHeaders,
  });

  const raw = await res.text();
  let data: any = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && (data.error || data.message)) ||
      (typeof data === "string" && data.trim() ? data : null) ||
      `Error ${res.status}`;
    throw new Error(message);
  }

  return (data ?? {}) as T;
}
