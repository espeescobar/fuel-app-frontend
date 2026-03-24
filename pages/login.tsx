import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { apiFetch } from "../lib/api";
import { clearToken, getToken, setToken } from "../lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const token = getToken();

  useEffect(() => {
    if (token) router.replace("/dashboard");
  }, [router]);

  async function submit() {
    setError(null);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : {
              email,
              password,
              name
            };

      const resp = await apiFetch<{ token: string }>(path, { method: "POST", body: JSON.stringify(body) });
      setToken(resp.token);
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Error desconocido");
    }
  }

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="container">
      <div className="login-hero">
        <span className="badge">Bencina compartida</span>
        <h1 className="login-title">{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
        <p className="lead" style={{ margin: "0 auto" }}>
          Registra lecturas del tablero y cargas para ver el consumo por persona.
        </p>
      </div>

      <div className="card card--accent-sky">
        {error ? <div className="alert alert--error">{error}</div> : null}

        {mode === "register" ? (
          <>
            <label>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </>
        ) : null}

        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button type="button" className="btn-primary" onClick={submit}>
          {mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>

        <div className="btn-row">
          {mode === "login" ? (
            <button type="button" className="btn-ghost" onClick={() => setMode("register")}>
              Ir a registrarse
            </button>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              Ir a iniciar sesión
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
