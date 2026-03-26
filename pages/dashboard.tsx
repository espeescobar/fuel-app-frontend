import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { apiFetch } from "../lib/api";
import { clearToken, getToken } from "../lib/auth";
import OcrPreviewForm from "../components/OcrPreviewForm";

type MeResp = { id: string; email: string; name?: string; vehicleId: string };
type ReadingItem = {
  id: string;
  userId: string;
  vehicleId: string;
  imagePath: string;
  odometerKm: any;
  kmPerLiter: any;
  capturedAt: string;
  createdAt: string;
};

type FillUpItem = { id: string; filledAt: string; liters: any; totalCost: any; pricePerLiter: any };

type UserItem = { id: string; name: string };
type StandardTrip = { id: string; name: string; distanceKm: number };

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<MeResp | null>(null);
  const [readings, setReadings] = useState<ReadingItem[]>([]);
  const [fillups, setFillups] = useState<FillUpItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [standardTrips, setStandardTrips] = useState<StandardTrip[]>([]);
  
  const [currentLiters, setCurrentLiters] = useState<number | null>(null);
  const [currentAvgPrice, setCurrentAvgPrice] = useState<number | null>(null);

  const [liters, setLiters] = useState<string>("");
  const [totalCost, setTotalCost] = useState<string>("");
  const [filledAt, setFilledAt] = useState<string>("");

  const [showFillups, setShowFillups] = useState<boolean>(false);

  const formatDec = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  useEffect(() => {
    const t = getToken();
    setToken(t);
    if (!t) {
      router.replace("/login");
    }
  }, [router]);

  async function load() {
    if (!token) return;
    
    try {
      const m = await apiFetch<MeResp>("/api/auth/me", { method: "GET", token });
      setMe(m);
    } catch (e) { console.error("Error cargando perfil"); }

    try {
      const r = await apiFetch<{ items: ReadingItem[] }>("/api/readings", { method: "GET", token });
      setReadings(r.items || []);
    } catch (e) { console.error("Error cargando lecturas"); }

    try {
      const f = await apiFetch<{ items: FillUpItem[] }>("/api/fill-ups", { method: "GET", token });
      setFillups(f.items || []);
    } catch (e) { console.error("Error cargando cargas"); }

    try {
      const u = await apiFetch<{ items: UserItem[] }>("/api/users", { method: "GET", token });
      setUsers(u.items || []);
    } catch (e) { console.error("Error cargando usuarios"); }

    try {
      const st = await apiFetch<{ items: StandardTrip[] }>("/api/standard-trips", { method: "GET", token });
      setStandardTrips(st.items || []);
    } catch (e) { console.error("Error cargando viajes estándar"); }

    try {
      const rep = await apiFetch<{ currentLitersRemaining?: number, currentAveragePrice?: number }>("/api/reports/usage-by-user", { method: "GET", token });
      if (rep && rep.currentLitersRemaining !== undefined) {
        setCurrentLiters(rep.currentLitersRemaining);
      }
      if (rep && rep.currentAveragePrice !== undefined) {
        setCurrentAvgPrice(rep.currentAveragePrice);
      }
    } catch (e) {
      console.error("Error obteniendo el reporte:", e);
    }
  }

  useEffect(() => {
    if (!token) return;
    load().catch((e) => setStatus(e?.message ?? "Error cargando datos"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onCreateFillUp() {
    if (!token) return;
    setStatus(null);
    try {
      await apiFetch<{ id: string }>("/api/fill-ups", {
        method: "POST",
        token,
        body: JSON.stringify({
          liters: Number(liters),
          totalCost: Number(totalCost),
          filledAt: filledAt ? new Date(filledAt).toISOString() : undefined
        })
      });
      setLiters("");
      setTotalCost("");
      setFilledAt("");
      await load();
      setStatus("Carga registrada.");
      setShowFillups(true); 
    } catch (e: any) {
      setStatus(e?.message ?? "Error registrando carga");
    }
  }

  function logout() {
    clearToken();
    router.replace("/login");
  }

  // Obtenemos el odómetro más alto para mostrarlo
  const maxOdometer = readings.length > 0 
    ? Math.max(...readings.map(r => Number(r.odometerKm))) 
    : null;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          {me ? <p className="lead">Sesión: {me.name ?? me.email}</p> : null}
        </div>
        <div className="btn-row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn-secondary" onClick={() => router.replace("/reports")}>
            Reportes
          </button>
          <button type="button" className="btn-ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {status ? (
        <div className={`alert ${status.includes("Error") ? "alert--error" : "alert--success"}`}>{status}</div>
      ) : null}

      <div className="card card--accent-sky">
        
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.75)', 
          padding: '1rem', 
          borderRadius: 'var(--radius-sm)', 
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 14px -4px rgba(14, 165, 233, 0.15)'
        }}>
          {/* Precio Referencial */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Precio ref.
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--sky-500)', marginTop: '0.25rem' }}>
              {currentAvgPrice !== null && currentAvgPrice > 0 
                ? `$${formatDec(currentAvgPrice)} / L` 
                : (fillups.length > 0 ? `$${formatDec(fillups[0].pricePerLiter)} / L` : '---')}
            </span>
          </div>
          
          <div style={{ width: '1px', backgroundColor: 'var(--border)', height: '40px' }}></div>
          
          {/* Estanque Estimado */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Estanque est.
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--sky-500)', marginTop: '0.25rem' }}>
              {currentLiters !== null ? `${formatDec(currentLiters)} L` : '---'}
            </span>
          </div>

          <div style={{ width: '1px', backgroundColor: 'var(--border)', height: '40px' }}></div>

          {/* NUEVO: Odómetro */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Odómetro
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--sky-500)', marginTop: '0.25rem' }}>
              {maxOdometer !== null ? `${maxOdometer} km` : '---'}
            </span>
          </div>
        </div>

        {token ? (() => {
          // Reutilizamos el maxOdometer que calculamos arriba
          const lastOdometer = maxOdometer ?? 0;

          return (
            // @ts-ignore
            <OcrPreviewForm 
              token={token} 
              onCreated={() => load()} 
              users={users} 
              standardTrips={standardTrips} 
              lastOdometer={lastOdometer}
            />
          );
        })() : null}
      </div>

      <hr className="divider" />

      <div className="card card--accent-hot-pink">
        <h3 style={{ color: '#ff69b4', margin: '0 0 1.25rem', fontWeight: '800' }}>Registrar carga de bencina</h3>
        <div className="row">
          <div>
            <label>Litros</label>
            <input value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="ej: 35.2" />
          </div>
          <div>
            <label>Costo total</label>
            <input value={totalCost} onChange={(e) => setTotalCost(e.target.value)} placeholder="ej: 25000" />
          </div>
        </div>

        <label>Fecha y hora (opcional)</label>
        <input type="datetime-local" value={filledAt} onChange={(e) => setFilledAt(e.target.value)} />

        <button type="button" className="btn-primary" onClick={onCreateFillUp}>
          Guardar carga
        </button>
      </div>

      <hr className="divider" style={{ marginBottom: '1.5rem' }} />
      
    </div>
  );
}
