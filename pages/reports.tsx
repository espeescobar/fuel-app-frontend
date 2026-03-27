import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { apiFetch } from "../lib/api";
import { clearToken, getToken } from "../lib/auth";

type ReportItem = {
  userId: string;
  userName: string;
  litersUsed: number;
  costUsed: number;
  ownCost: number;
  sharedCost: number;
  pricePerLiter: number | null;
};

type TripItem = {
  id: string;
  date: string;
  title: string;
  driverName: string;
  sharedWithNames: string[];
  distance: number;
  liters: number;
  cost: number;
};

type FillUpItem = { 
  id: string; 
  filledAt: string; 
  liters: any; 
  totalCost: any; 
  pricePerLiter: any; 
};

type ReportResp = {
  from: any;
  to: any;
  warnings?: string[];
  items: ReportItem[];
  trips?: TripItem[];
};

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReportsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [report, setReport] = useState<ReportResp | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [fillups, setFillups] = useState<FillUpItem[]>([]);
  
  const [showTrips, setShowTrips] = useState<boolean>(false);
  const [showFillups, setShowFillups] = useState<boolean>(false);

  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), []);

  const [fromValue, setFromValue] = useState<string>(toLocalInputValue(defaultFrom));
  const [toValue, setToValue] = useState<string>(toLocalInputValue(now));

  const formatDec = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  useEffect(() => {
    const t = getToken();
    setToken(t);
    if (!t) router.replace("/login");
  }, [router]);

  async function loadReport() {
    if (!token) return;
    setError(null);
    setWarnings([]);
    try {
      const fromIso = new Date(fromValue).toISOString();
      const toIso = new Date(toValue).toISOString();
 
      // 1. CAMBIO AQUÍ: Volvemos a la ruta original que SÍ existe en el backend
      const q = `/api/reports/usage-by-user?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
      
      const resp = await apiFetch<ReportResp>(q, { method: "GET", token });
      setReport(resp);
      setWarnings(resp.warnings ?? []);
 
      // 2. OBTENCIÓN DE CARGAS: 
      const f = await apiFetch<{ items: FillUpItem[] }>("/api/fill-ups", { method: "GET", token });
      
      const filteredFillups = (f.items || []).filter(item => {
        const date = new Date(item.filledAt);
        return date >= new Date(fromIso) && date <= new Date(toIso);
      });
      
      setFillups(filteredFillups);
 
    } catch (e: any) {
      setError(e?.message ?? "Error obteniendo el reporte");
    }
  }
    

  // --- NUEVAS FUNCIONES DE ELIMINACIÓN ---
  async function handleDeleteTrip(id: string) {
    if (!token) return;
    if (!window.confirm("¿Seguro que deseas eliminar este viaje?\n\nLa bencina y los costos adeudados se recalcularán automáticamente.")) return;
    
    try {
      await apiFetch(`/api/reports/delete-trip/${id}`, { method: "DELETE", token });
      await loadReport(); // Recargamos la tabla para que haga la matemática de nuevo
    } catch (e: any) {
      alert(e?.message || "Error al eliminar el viaje");
    }
  }

  async function handleDeleteFillup(id: string) {
    if (!token) return;
    if (!window.confirm("¿Seguro que deseas eliminar esta carga de bencina?\n\nEl precio de referencia y el estanque estimado se recalcularán automáticamente.")) return;
    
    try {
      await apiFetch(`/api/reports/delete-fillup/${id}`, { method: "DELETE", token });
      await loadReport(); // Recargamos la tabla
    } catch (e: any) {
      alert(e?.message || "Error al eliminar la carga");
    }
  }
  // ----------------------------------------

  function logout() {
    clearToken();
    router.replace("/login");
  }

  useEffect(() => {
    if (token) {
      loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Reportes</h1>
        </div>
        <div className="btn-row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn-secondary" onClick={() => router.replace("/dashboard")}>
            Dashboard
          </button>
          <button type="button" className="btn-ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="card card--accent-sky">
        <div className="row">
          <div>
            <label>Desde</label>
            <input type="datetime-local" value={fromValue} onChange={(e) => setFromValue(e.target.value)} />
          </div>
          <div>
            <label>Hasta</label>
            <input type="datetime-local" value={toValue} onChange={(e) => setToValue(e.target.value)} />
          </div>
        </div>

        <button type="button" className="btn-primary" onClick={loadReport}>
          Actualizar
        </button>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      {warnings.length ? (
        <div className="card" style={{ borderColor: "rgba(244, 63, 94, 0.2)", background: "rgba(255, 241, 242, 0.55)" }}>
          <strong style={{ color: "var(--text-muted)" }}>Advertencias</strong>
          {warnings.map((w, idx) => (
            <div key={idx} style={{ marginTop: 8, fontSize: "0.9rem", color: "var(--text)" }}>
              {w}
            </div>
          ))}
        </div>
      ) : null}

      {/* ----------------- TABLA 1: RESUMEN MENSUAL ----------------- */}
      <h3 style={{ marginTop: "2rem", color: 'var(--sky-400)', margin: '0 0 1.25rem', fontWeight: '800' }}>Resumen de Gastos por Usuario</h3>
      <div className="table-wrap" style={{ marginBottom: '2rem' }}>
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Litros usados</th>
              <th>Gasto Propio</th>
              <th>Gasto Compartido</th>
              <th>Total Gasto</th>
            </tr>
          </thead>
          <tbody>
            {report?.items?.length ? (
              report.items.map((it) => (
                <tr key={it.userId}>
                  <td>{it.userName}</td>
                  <td>{it.litersUsed.toFixed(2)} L</td>
                  <td>${it.ownCost ? it.ownCost.toFixed(2) : "0.00"}</td>
                  <td>${it.sharedCost ? it.sharedCost.toFixed(2) : "0.00"}</td>
                  <td><strong style={{ color: 'var(--sky-500)' }}>${it.costUsed.toFixed(2)}</strong></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="table-empty">
                  Sin datos para el rango seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ----------------- SECCIÓN DESPLEGABLE: HISTORIAL DE VIAJES ----------------- */}
      <div 
        onClick={() => setShowTrips(!showTrips)}
        style={{
          background: showTrips ? 'var(--hot-pink-50)' : 'rgba(255, 255, 255, 0.82)',
          border: '1px solid var(--border)',
          borderColor: showTrips ? 'var(--hot-pink-300)' : 'rgba(244, 63, 94, 0.2)',
          borderRadius: 'var(--radius)',
          padding: '1.25rem 1.5rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: showTrips ? '0 4px 14px -4px rgba(244, 63, 94, 0.25)' : 'var(--shadow)',
          transition: 'all 0.3s ease',
          marginBottom: showTrips ? '1rem' : '1.5rem',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>🚗</span>
          <h3 style={{ margin: 0, color: showTrips ? 'var(--hot-pink-400)' : 'var(--hot-pink-400)' }}>
            Historial de Viajes
          </h3>
        </div>
        <div style={{ 
          transform: showTrips ? 'rotate(180deg)' : 'rotate(0deg)', 
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          color: 'var(--hot-pink-400)',
          fontWeight: 'bold',
          fontSize: '1.2rem'
        }}>
          ▼
        </div>
      </div>

      {showTrips && (
        <div className="table-wrap" style={{ marginBottom: '3rem' }}>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Motivo / Viaje</th>
                <th>Conductor</th>
                <th>Acompañantes</th>
                <th>Distancia</th>
                <th>Costo Total</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {report?.trips?.length ? (
                report.trips.map((trip) => (
                  <tr key={trip.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(trip.date).toLocaleDateString()}</td>
                    <td>{trip.title}</td>
                    <td>{trip.driverName}</td>
                    <td>
                      {trip.sharedWithNames.length > 0 
                        ? trip.sharedWithNames.join(", ") 
                        : <span style={{ color: "#aaa", fontSize: "0.9em" }}>Ninguno</span>}
                    </td>
                    <td>{trip.distance.toFixed(1)} km</td>
                    <td><strong>${trip.cost.toFixed(2)}</strong></td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDeleteTrip(trip.id)}
                        style={{ 
                          background: 'none', border: 'none', cursor: 'pointer', 
                          fontSize: '1.2rem', padding: '4px', filter: 'grayscale(0.2)' 
                        }}
                        title="Eliminar Viaje"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="table-empty">
                    No hay viajes registrados en este rango.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ----------------- SECCIÓN DESPLEGABLE: HISTORIAL DE CARGAS DE BENCINA ----------------- */}
      <div 
        onClick={() => setShowFillups(!showFillups)}
        style={{
          background: showFillups ? 'var(--hot-pink-50)' : 'rgba(255, 255, 255, 0.82)',
          border: '1px solid var(--border)',
          borderColor: showFillups ? 'var(--hot-pink-300)' : 'rgba(244, 63, 94, 0.2)',
          borderRadius: 'var(--radius)',
          padding: '1.25rem 1.5rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: showFillups ? '0 4px 14px -4px rgba(244, 63, 94, 0.25)' : 'var(--shadow)',
          transition: 'all 0.3s ease',
          marginBottom: showFillups ? '1rem' : '3rem',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>⛽</span>
          <h3 style={{ margin: 0, color: showFillups ? 'var(--hot-pink-400)' : 'var(--hot-pink-400)' }}>
            Cargas de Bencina
          </h3>
        </div>
        <div style={{ 
          transform: showFillups ? 'rotate(180deg)' : 'rotate(0deg)', 
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          color: 'var(--hot-pink-400)',
          fontWeight: 'bold',
          fontSize: '1.2rem'
        }}>
          ▼
        </div>
      </div>

      {showFillups && (
        <div className="table-wrap" style={{ marginBottom: '3rem' }}>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Litros Cargados</th>
                <th>Costo Total</th>
                <th>Precio Referencia</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fillups.length > 0 ? (
                fillups.map((f) => (
                  <tr key={f.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {new Date(f.filledAt).toLocaleDateString()} a las {new Date(f.filledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td>{formatDec(f.liters)} L</td>
                    <td><strong>${formatDec(f.totalCost)}</strong></td>
                    <td>${formatDec(f.pricePerLiter)} / L</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDeleteFillup(f.id)}
                        style={{ 
                          background: 'none', border: 'none', cursor: 'pointer', 
                          fontSize: '1.2rem', padding: '4px', filter: 'grayscale(0.2)' 
                        }}
                        title="Eliminar Carga"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="table-empty">
                    Aún no hay cargas de bencina registradas en este rango de fechas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
