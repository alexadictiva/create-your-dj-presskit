"use client";

import { useEffect, useState } from "react";

type Dj = {
  id: string;
  artistName: string;
  city: string;
  email: string;
  genres: string[];
  template: string;
  createdAt: string;
};

export default function AdminPage() {
  const [djs, setDjs] = useState<Dj[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      try {
        if (supabaseUrl && supabaseKey) {
          const { createClient } = await import("@supabase/supabase-js");
          const { data, error: queryError } = await createClient(supabaseUrl, supabaseKey)
            .from("djs")
            .select("id, artistName, city, email, genres, template, createdAt")
            .order("createdAt", { ascending: false });
          if (queryError) throw queryError;
          setDjs((data ?? []) as Dj[]);
        } else {
          const response = await fetch("/api/presskits");
          if (!response.ok) throw new Error("No se pudo cargar la base de DJs");
          setDjs(await response.json() as Dj[]);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Error al cargar");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="brand" href="/"><span>KIT</span>BEAT<i>.</i></a>
        <a href="/">← Volver al sitio</a>
      </header>
      <section>
        <div className="admin-title">
          <div><p>[ ADMIN / DATABASE ]</p><h1>DJs registrados</h1></div>
          <strong>{djs.length.toString().padStart(2, "0")}</strong>
        </div>
        {loading && <div className="admin-empty">CARGANDO REGISTROS...</div>}
        {error && <div className="admin-empty error">{error}</div>}
        {!loading && !error && djs.length === 0 && <div className="admin-empty">Todavía no hay press kits generados.</div>}
        {djs.length > 0 && (
          <div className="admin-table-wrap">
            <table>
              <thead><tr><th>DJ</th><th>Ubicación</th><th>Géneros</th><th>Plantilla</th><th>Fecha</th><th>Contacto</th></tr></thead>
              <tbody>{djs.map((dj) => <tr key={dj.id}><td><b>{dj.artistName}</b></td><td>{dj.city}</td><td>{dj.genres?.join(", ")}</td><td><span className={`badge ${dj.template}`}>{dj.template}</span></td><td>{new Date(dj.createdAt).toLocaleDateString("es-AR")}</td><td><a href={`mailto:${dj.email}`}>{dj.email} ↗</a></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
      <style>{`
        .admin-page{min-height:100vh;background:#09090b;color:#f4f2ed;padding-bottom:80px}.admin-header{height:78px;border-bottom:1px solid #29292d;padding:0 5vw;display:flex;align-items:center;justify-content:space-between}.admin-header>a:last-child{font-size:10px;color:#888;font-weight:800}.admin-page section{padding:70px 5vw}.admin-title{display:flex;align-items:end;justify-content:space-between;border-bottom:1px solid #39393d;padding-bottom:30px}.admin-title p{font-size:9px;color:#b7ff3c;font-weight:900;letter-spacing:.15em}.admin-title h1{font-size:clamp(44px,8vw,90px);letter-spacing:-.06em;margin:12px 0 0}.admin-title>strong{font-size:clamp(50px,10vw,120px);color:#222227;line-height:.7}.admin-empty{padding:70px 20px;text-align:center;color:#666;font-size:11px;letter-spacing:.12em;border-bottom:1px solid #29292d}.admin-empty.error{color:#ff7967}.admin-table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:850px}th,td{text-align:left;border-bottom:1px solid #29292d;padding:20px 12px;font-size:11px}th{color:#666;font-size:8px;letter-spacing:.12em}td b{font-size:15px}td a{color:#b7ff3c}.badge{border:1px solid #555;padding:5px 8px;text-transform:uppercase;font-size:8px}.badge.pulse{border-color:#b7ff3c;color:#b7ff3c}.badge.voltage{border-color:#ff2a78;color:#ff2a78}.badge.afterdark{border-color:#ff3d24;color:#ff3d24}
      `}</style>
    </main>
  );
}
