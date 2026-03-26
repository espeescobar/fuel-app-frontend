export function getBackendUrl() {
  // Asegúrate de que este nombre sea IGUAL al que escribiste en Vercel
  const base = process.env.NEXT_PUBLIC_API_URL; 
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

  if (!res.ok) {
    let detail: any = null;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    // Si el error es un objeto, intentamos sacar el mensaje específico
    const message = detail?.error || detail?.message || (typeof detail === "string" ? detail : JSON.stringify(detail));
    throw new Error(message);
  }

  return (await res.json()) as T;
}
