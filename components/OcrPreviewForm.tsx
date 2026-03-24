import { useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

type UserItem = { id: string; name: string; email?: string };
type StandardTrip = { id: string; name: string; distanceKm: number };

type Props = {
  token: string;
  onCreated?: () => void;
  users?: UserItem[];
  standardTrips?: StandardTrip[];
  lastOdometer?: number; // <-- NUEVO: Recibimos el último odómetro
};

export default function OcrPreviewForm({ token, onCreated, users = [], standardTrips = [], lastOdometer = 0 }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [odometerKm, setOdometerKm] = useState<string>("");
  const [kmPerLiter, setKmPerLiter] = useState<string>("");

  const [title, setTitle] = useState<string>("");
  const [isShared, setIsShared] = useState<boolean>(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [newTripDist, setNewTripDist] = useState("");
  const [isSavingTrip, setIsSavingTrip] = useState(false);

  const canSuggest = useMemo(() => !!file && !isPreviewing, [file, isPreviewing]);
  
  // MODIFICADO: Ya no exigimos "!!file" para poder guardar.
  // Ahora solo exigimos que los números estén escritos.
  const canSave = useMemo(() => 
    !isSaving && odometerKm.trim() !== "" && kmPerLiter.trim() !== "", 
    [isSaving, odometerKm, kmPerLiter]
  );

  function onPickFile(f: File | null) {
    setError(null);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl(null);
  }

  // --- MAGIA MATEMÁTICA AQUÍ ---
  function handleStandardTripChange(tripId: string) {
    const trip = standardTrips.find(t => t.id === tripId);
    if (trip) {
      setTitle(trip.name);
      
      // Si tenemos un odómetro anterior, le sumamos la distancia del viaje
      if (lastOdometer > 0) {
        const calculatedOdo = lastOdometer + Number(trip.distanceKm);
        setOdometerKm(calculatedOdo.toFixed(1)); // Se rellena solo con 1 decimal
      }
    } else {
      setTitle("");
      // Opcional: limpiar el odómetro si deselecciona el viaje
      // setOdometerKm(""); 
    }
  }

  async function saveNewStandardTrip() {
    if (!newTripName.trim() || !newTripDist.trim()) {
      setError("Por favor, ingresa el nombre y los kilómetros del viaje.");
      return;
    }
    
    setError(null);
    setIsSavingTrip(true);
    try {
      await apiFetch("/api/standard-trips", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: newTripName,
          distanceKm: Number(newTripDist)
        })
      });

      setNewTripName("");
      setNewTripDist("");
      setIsCreatingTrip(false);
      onCreated?.(); 
    } catch (e: any) {
      setError(e?.message || "Error al guardar el viaje frecuente.");
    } finally {
      setIsSavingTrip(false);
    }
  }

  async function suggest() {
    if (!file) return;
    setError(null);
    setIsPreviewing(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      
      const resp = await apiFetch<{ odometerKm: number | null; kmPerLiter: number | null }>(
        "/api/readings/ocr-preview",
        { method: "POST", body: fd, token }
      );

      if (resp.odometerKm == null || resp.kmPerLiter == null) {
        setError("No pude leer los datos. Revisa la foto o escribe los valores.");
      }
      
      if (resp.odometerKm != null) setOdometerKm(String(resp.odometerKm));
      if (resp.kmPerLiter != null) setKmPerLiter(String(resp.kmPerLiter));
    } catch (e: any) {
      setError(e?.message || "Error al procesar OCR");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function save() {
    // ELIMINADO: if (!file) return; <- Ahora permitimos guardar sin foto
    setError(null);
    setIsSaving(true);
    try {
      const fd = new FormData();
      
      // Solo enviamos la imagen si el usuario subió una
      if (file) {
        fd.append("image", file);
      }
      
      fd.append("odometerKm", odometerKm);
      fd.append("kmPerLiter", kmPerLiter);
      fd.append("capturedAt", new Date().toISOString());
      
      if (title.trim()) fd.append("title", title.trim());
      if (isShared && selectedUserIds.length > 0) {
        fd.append("sharedUserIds", JSON.stringify(selectedUserIds));
      }

      await apiFetch("/api/readings", { 
        method: "POST", 
        body: fd, 
        token 
      });

      onCreated?.();
      setFile(null);
      setPreviewUrl(null);
      setOdometerKm("");
      setKmPerLiter("");
      setTitle("");
      setIsShared(false);
      setSelectedUserIds([]);
    } catch (e: any) {
      setError(e?.message || "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <h3 style={{ color: '#ff69b4', margin: '0 0 1.25rem', fontWeight: '800' }}>Registrar Viaje</h3>

      <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(255, 255, 255, 0.5)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ margin: 0, color: 'var(--sky-500)' }}>¿Es un viaje frecuente?</label>
          <button 
            type="button" 
            onClick={() => setIsCreatingTrip(!isCreatingTrip)}
            style={{ 
              background: 'none', border: 'none', color: 'var(--hot-pink-400)', 
              fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', padding: 0, width: 'auto', marginTop: 0, boxShadow: 'none'
            }}
          >
            {isCreatingTrip ? "✕ Cancelar" : "+ Crear nuevo"}
          </button>
        </div>

        {isCreatingTrip ? (
          <div style={{ marginTop: '10px', padding: '10px', background: 'var(--white)', borderRadius: '6px', border: '1px dashed var(--sky-300)' }}>
            <div className="row">
              <div>
                <label style={{ fontSize: '0.7rem' }}>Nombre del viaje</label>
                <input value={newTripName} onChange={(e) => setNewTripName(e.target.value)} placeholder="Ej: Universidad" />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem' }}>Distancia (km)</label>
                <input value={newTripDist} onChange={(e) => setNewTripDist(e.target.value)} placeholder="Ej: 15.5" type="number" step="0.1" />
              </div>
            </div>
            <button 
              type="button" 
              className="btn-primary" 
              style={{ marginTop: '10px', padding: '6px', fontSize: '0.85rem' }}
              onClick={saveNewStandardTrip}
              disabled={isSavingTrip}
            >
              {isSavingTrip ? "Guardando..." : "Guardar Viaje Frecuente"}
            </button>
          </div>
        ) : (
          standardTrips.length > 0 ? (
            <select 
              onChange={(e) => handleStandardTripChange(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '8px', marginTop: '8px' }}
            >
              <option value="">Seleccionar viaje...</option>
              {standardTrips.map(trip => (
                <option key={trip.id} value={trip.id}>
                  {trip.name} ({trip.distanceKm} km)
                </option>
              ))}
            </select>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>No tienes viajes frecuentes guardados.</p>
          )
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>Nombre del viaje (opcional)</label>
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Si no es frecuente, escribe el nombre aquí..."
        />
      </div>

      {/* --- SECCIÓN DE COMPARTIR VIAJE (MEJORADA VISUALMENTE) --- */}
      <div style={{ marginBottom: 16 }}>
        
        {/* Tarjeta interactiva con el interruptor ocultando el checkbox feo */}
        <label 
          htmlFor="shareCheckbox"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: isShared ? 'var(--sky-50)' : 'var(--white)',
            border: `1px solid ${isShared ? 'var(--sky-300)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isShared ? '0 4px 12px -4px rgba(14, 165, 233, 0.2)' : '0 2px 8px -4px rgba(0,0,0,0.05)',
            marginBottom: '8px',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.3rem' }}>🤝</span>
            <span style={{ margin: 0, fontWeight: 600, color: isShared ? 'var(--sky-500)' : 'var(--text)' }}>
              Compartir costo del viaje
            </span>
          </div>

          {/* Diseño del interruptor (Toggle) */}
          <div style={{
            position: 'relative',
            width: '44px',
            height: '24px',
            backgroundColor: isShared ? 'var(--sky-400)' : '#cbd5e1',
            borderRadius: '12px',
            transition: 'background-color 0.3s ease'
          }}>
            <div style={{
              position: 'absolute',
              top: '2px',
              left: isShared ? '22px' : '2px',
              width: '20px',
              height: '20px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }} />
          </div>

          {/* El checkbox original oculto (sigue haciendo el trabajo por detrás) */}
          <input 
            type="checkbox" 
            id="shareCheckbox"
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
            style={{ display: 'none' }}
          />
        </label>

        {/* Menú de acompañantes que aparece al encender el interruptor */}
        {isShared && (
          <div style={{ 
            marginTop: '8px', 
            padding: '12px', 
            backgroundColor: 'var(--white)', 
            borderRadius: 'var(--radius-sm)', 
            border: '1px dashed var(--sky-300)' 
          }}>
            <label style={{ color: 'var(--sky-500)', fontSize: '0.8rem', marginTop: 0 }}>
              Selecciona los acompañantes:
            </label>
            {users.length > 0 ? (
              <>
                <select 
                  multiple
                  value={selectedUserIds}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedUserIds(values);
                  }}
                  style={{ 
                    display: 'block', 
                    width: '100%', 
                    padding: '8px', 
                    marginTop: '8px', 
                    height: '90px', 
                    border: '1px solid var(--sky-200)',
                    borderRadius: '8px'
                  }}
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id} style={{ padding: '6px' }}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                  * Mantén presionado <strong>Ctrl</strong> (o <strong>Cmd ⌘</strong> en Mac) para seleccionar a varios.
                </small>
              </>
            ) : (
              <p style={{ color: 'var(--hot-pink-400)', fontSize: '14px', margin: '4px 0' }}>
                Aún no tienes amigos registrados en la app para compartir.
              </p>
            )}
          </div>
        )}
      </div>

      <label>Foto del tablero (Opcional)</label>
      {/* --- BOTÓN DE SUBIR FOTO MEJORADO --- */}
      <div style={{ marginBottom: '16px' }}>
        
        {/* El input real está oculto (display: none) */}
        <input
          id="tablero-upload"
          type="file"
          accept="image/*"
          onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          style={{ display: 'none' }} 
        />
        
        {/* El "falso" botón que sí se ve y está conectado al input mediante htmlFor */}
        <label 
          htmlFor="tablero-upload"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: file ? '10px' : '1.5rem', /* Menos padding si hay foto para que ocupe todo */
            border: `2px dashed ${file ? 'var(--hot-pink-300)' : 'var(--sky-300)'}`,
            borderRadius: 'var(--radius)',
            backgroundColor: file ? 'var(--hot-pink-50)' : 'var(--sky-50)',
            color: 'var(--sky-600)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'center',
            overflow: 'hidden' /* Asegura que la imagen no se salga de los bordes redondeados */
          }}
        >
          {previewUrl ? (
            // Si hay foto, mostramos SOLO la foto usando tu clase CSS para que respete el tamaño
            <div className="img-preview" style={{ width: '100%' }}>
              <img src={previewUrl} alt="Previsualización" style={{ margin: '0 auto', display: 'block' }} />
            </div>
          ) : (
            // Si no hay foto, mostramos la camarita original
            <>
              <span style={{ fontSize: '2rem', marginBottom: '8px' }}>
                📸
              </span>
              <span style={{ fontWeight: '600', fontSize: '1rem' }}>
                Toca aquí para subir la foto
              </span>
            </>
          )}
        </label>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div>
          <label>Odómetro (km)</label>
          <input value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} placeholder="ej: 12345" />
        </div>
        <div>
          <label>Rendimiento (km/L)</label>
          <input value={kmPerLiter} onChange={(e) => setKmPerLiter(e.target.value)} placeholder="ej: 12.3" />
        </div>
      </div>

      {error && <div className="alert alert--error" style={{ marginTop: '10px' }}>{error}</div>}

      <div className="btn-row" style={{ marginTop: '15px' }}>
        <button type="button" className='btn-ghost' disabled={!canSuggest} onClick={suggest}>
          {isPreviewing ? "Procesando..." : "Sugerir con OCR"}
        </button>
        <button type="button" className="btn-primary" disabled={!canSave} onClick={save}>
          {isSaving ? "Guardando..." : "Guardar lectura"}
        </button>
      </div>
    </div>
  );
}