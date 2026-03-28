import { useEffect, useState } from "react";
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
};

type ReportResp = {
  items: ReportItem[];
  currentAveragePrice: number;
};

export default function HistorialMensualPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  
  // Por defecto, seleccionamos el mes actual (formato YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });

  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const [avgPrice, setAvgPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  function logout() {
    clearToken();
    router.replace("/login");
  }

  useEffect(() => {
    const t = getToken();
    setToken(t);
    if (!t) router.replace("/login");
  }, [router]);

  async function loadMonthData() {
    if (!token || !selectedMonth) return;
    setIsLoading(true);
    setError(null);

    try {
      // Magia para sacar el primer y último día del mes seleccionado
      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1; // En JS los meses van de 0 a 11

      const fromDate = new Date(year, month, 1); // Día 1
      const toDate = new Date(year, month + 1, 0, 23, 59, 59); // Último día a las 23:59

      const q = `/api/reports/usage-by-user?from=${encodeURIComponent(fromDate.toISOString())}&to=${encodeURIComponent(toDate.toISOString())}`;
      
      const resp = await apiFetch<ReportResp>(q, { method: "GET", token });
      setReportData(resp.items || []);
      setAvgPrice(resp.currentAveragePrice || 0);

    } catch (e: any) {
      setError(e?.message ?? "Error obteniendo el historial mensual");
    } finally {
      setIsLoading(false);
    }
  }

  // Cargar los datos automáticamente cuando cambia el mes o el token
  useEffect(() => {
    loadMonthData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, token]);

  // Función para formatear dinero
  const formatMoney = (val: number) => `$${val.toFixed(2)}`;

  return (
    <div className="shell">
      <div className="container">
        {/* Cabecera */}
        <div className="page-header">
          <div>
            <h1>Historial </h1>
          </div>
          <div className="btn-row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn-ghost" onClick={logout}>
              Cerrar Sesión
            </button>
          </div>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        {/* Tarjeta de Filtro - Usando tu estilo Hot Pink */}
        <div className="card card--accent-hot-pink">
          <h3 style={{ color: 'var(--hot-pink-400)' }}>Selecciona el mes</h3>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div>
              {/* Información extra de contexto */}
              {avgPrice > 0 && !isLoading && (
                <div style={{ padding: '0.65rem', background: 'rgba(255,255,255,0.8)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--sky-300)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Precio Promedio del Mes</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--sky-400)' }}>
                    {formatMoney(avgPrice)} / L
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Litros Usados</th>
                  <th>Total a Pagar</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="table-empty">Calculando bencina... 💅</td>
                  </tr>
                ) : reportData.length > 0 ? (
                  reportData.map((user) => (
                    <tr key={user.userId}>
                      <td style={{ fontWeight: 600 }}>{user.userName}</td>
                      <td>{user.litersUsed.toFixed(1)} L</td>
                      <td>
                        <strong style={{ color: 'var(--hot-pink-400)', fontSize: '1.1rem' }}>
                          {formatMoney(user.costUsed)}
                        </strong>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      No hay viajes ni gastos registrados en este mes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}