"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/src/lib/supabase-browser";

type Dj = {
  id: string;
  artistName: string;
  city: string;
  email: string;
  genres: string[];
  template: string;
  createdAt: string;
};

type AdminStatus =
  | "checking"
  | "signed-out"
  | "checking-access"
  | "authorized"
  | "forbidden"
  | "configuration-error";

export default function AdminPage() {
  const [djs, setDjs] = useState<Dj[]>([]);
  const [status, setStatus] = useState<AdminStatus>("checking");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    async function applyUser(user: User | null) {
      const currentRequest = ++requestId;
      if (!active) return;

      setError("");
      setDjs([]);

      if (!user) {
        setUserEmail("");
        setStatus("signed-out");
        return;
      }

      setUserEmail(user.email ?? "");
      setStatus("checking-access");

      const supabase = getSupabaseBrowserClient();
      const { data: membership, error: membershipError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active || currentRequest !== requestId) return;
      if (membershipError) {
        setError("No se pudo verificar tu permiso de administrador.");
        setStatus("configuration-error");
        return;
      }
      if (!membership) {
        setStatus("forbidden");
        return;
      }

      const { data, error: queryError } = await supabase
        .from("djs")
        .select("id, artistName, city, email, genres, template, createdAt")
        .order("createdAt", { ascending: false });

      if (!active || currentRequest !== requestId) return;
      if (queryError) {
        setError("No se pudo cargar la base de DJs.");
        setStatus("authorized");
        return;
      }

      setDjs((data ?? []) as Dj[]);
      setStatus("authorized");
    }

    let unsubscribe = () => {};
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => {
          void applyUser(session?.user ?? null);
        }, 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar Supabase.");
      setStatus("configuration-error");
    }

    return () => {
      active = false;
      requestId += 1;
      unsubscribe();
    };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSigningIn(true);

    try {
      const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("Email o contraseña incorrectos.");
        return;
      }
      setPassword("");
    } catch {
      setError("No se pudo iniciar sesión. Intenta nuevamente.");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    setError("");
    await getSupabaseBrowserClient().auth.signOut();
  }

  const isChecking = status === "checking" || status === "checking-access";

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="brand" href="/"><span>KIT</span>BEAT<i>.</i></a>
        <div className="admin-header-actions">
          {userEmail && <span>{userEmail}</span>}
          {(status === "authorized" || status === "forbidden") && (
            <button type="button" onClick={() => void signOut()}>CERRAR SESIÓN</button>
          )}
          <a href="/">← Volver al sitio</a>
        </div>
      </header>

      {status === "signed-out" && (
        <section className="admin-login-section">
          <div className="admin-login-copy">
            <p>[ ACCESO RESTRINGIDO ]</p>
            <h1>Panel de<br />administración.</h1>
            <span>Inicia sesión con la cuenta autorizada en Supabase.</span>
          </div>
          <form className="admin-login-card" onSubmit={signIn}>
            <div className="login-status"><i /> SUPABASE AUTH</div>
            <label>
              EMAIL
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                placeholder="admin@kitbeat.com"
                required
              />
            </label>
            <label>
              CONTRASEÑA
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </label>
            {error && <div className="login-error" role="alert">{error}</div>}
            <button className="login-submit" type="submit" disabled={isSigningIn}>
              {isSigningIn ? "INGRESANDO..." : "INGRESAR AL PANEL"} <span>→</span>
            </button>
            <small>El acceso se valida mediante sesión y políticas RLS.</small>
          </form>
        </section>
      )}

      {isChecking && (
        <section>
          <div className="admin-empty">
            {status === "checking" ? "VERIFICANDO SESIÓN..." : "VERIFICANDO PERMISOS..."}
          </div>
        </section>
      )}

      {status === "configuration-error" && (
        <section>
          <div className="admin-empty error">{error}</div>
        </section>
      )}

      {status === "forbidden" && (
        <section className="admin-denied">
          <p>[ ACCESO DENEGADO ]</p>
          <h1>Esta cuenta no es administradora.</h1>
          <span>{userEmail}</span>
          <button type="button" onClick={() => void signOut()}>USAR OTRA CUENTA</button>
        </section>
      )}

      {status === "authorized" && (
        <section>
          <div className="admin-title">
            <div><p>[ ADMIN / DATABASE ]</p><h1>DJs registrados</h1></div>
            <strong>{djs.length.toString().padStart(2, "0")}</strong>
          </div>
          {error && <div className="admin-empty error">{error}</div>}
          {!error && djs.length === 0 && (
            <div className="admin-empty">TODAVÍA NO HAY PRESS KITS GENERADOS.</div>
          )}
          {djs.length > 0 && (
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>DJ</th>
                    <th>Ubicación</th>
                    <th>Géneros</th>
                    <th>Plantilla</th>
                    <th>Fecha</th>
                    <th>Contacto</th>
                  </tr>
                </thead>
                <tbody>
                  {djs.map((dj) => (
                    <tr key={dj.id}>
                      <td><b>{dj.artistName}</b></td>
                      <td>{dj.city}</td>
                      <td>{dj.genres?.join(", ")}</td>
                      <td><span className={`badge ${dj.template}`}>{dj.template}</span></td>
                      <td>{new Date(dj.createdAt).toLocaleDateString("es-AR")}</td>
                      <td><a href={`mailto:${dj.email}`}>{dj.email} ↗</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <style>{`
        .admin-page{min-height:100vh;background:#09090b;color:#f4f2ed;padding-bottom:80px}.admin-header{min-height:78px;border-bottom:1px solid #29292d;padding:14px 5vw;display:flex;align-items:center;justify-content:space-between;gap:24px}.admin-header-actions{display:flex;align-items:center;justify-content:flex-end;gap:18px;flex-wrap:wrap}.admin-header-actions>span{font-size:9px;color:#666}.admin-header-actions>a,.admin-header-actions>button{font:inherit;font-size:9px;color:#888;font-weight:800;background:transparent;border:0;padding:0}.admin-header-actions>button{color:#b7ff3c}.admin-page section{padding:70px 5vw}.admin-title{display:flex;align-items:end;justify-content:space-between;border-bottom:1px solid #39393d;padding-bottom:30px}.admin-title p,.admin-login-copy>p,.admin-denied>p{font-size:9px;color:#b7ff3c;font-weight:900;letter-spacing:.15em}.admin-title h1{font-size:clamp(44px,8vw,90px);letter-spacing:-.06em;margin:12px 0 0}.admin-title>strong{font-size:clamp(50px,10vw,120px);color:#222227;line-height:.7}.admin-empty{padding:70px 20px;text-align:center;color:#666;font-size:11px;letter-spacing:.12em;border-bottom:1px solid #29292d}.admin-empty.error{color:#ff7967}.admin-table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:850px}th,td{text-align:left;border-bottom:1px solid #29292d;padding:20px 12px;font-size:11px}th{color:#666;font-size:8px;letter-spacing:.12em}td b{font-size:15px}td a{color:#b7ff3c}.badge{border:1px solid #555;padding:5px 8px;text-transform:uppercase;font-size:8px}.badge.pulse{border-color:#b7ff3c;color:#b7ff3c}.badge.voltage{border-color:#ff2a78;color:#ff2a78}.badge.afterdark{border-color:#ff3d24;color:#ff3d24}.admin-login-section{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,460px);gap:8vw;align-items:center}.admin-login-copy h1,.admin-denied h1{font-size:clamp(48px,7vw,92px);line-height:.88;letter-spacing:-.065em;margin:18px 0 26px}.admin-login-copy>span,.admin-denied>span{color:#777;font-size:12px;line-height:1.6}.admin-login-card{border:1px solid #303036;background:#111114;padding:34px;box-shadow:16px 16px 0 #050506}.login-status{font-size:8px;letter-spacing:.14em;color:#777;border-bottom:1px solid #29292d;padding-bottom:20px;margin-bottom:26px}.login-status i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#b7ff3c;box-shadow:0 0 12px #b7ff3c;margin-right:7px}.admin-login-card label{display:grid;gap:9px;color:#777;font-size:8px;font-weight:900;letter-spacing:.12em;margin-top:18px}.admin-login-card input{width:100%;border:1px solid #303036;background:#09090b;color:#f4f2ed;padding:15px 14px;font:inherit;font-size:12px;outline:0}.admin-login-card input:focus{border-color:#b7ff3c;box-shadow:0 0 0 2px rgba(183,255,60,.08)}.login-error{border-left:2px solid #ff3d24;background:rgba(255,61,36,.08);color:#ff8b79;padding:12px;margin-top:18px;font-size:10px}.login-submit,.admin-denied button{width:100%;display:flex;align-items:center;justify-content:space-between;border:0;background:#b7ff3c;color:#080808;padding:16px;margin-top:24px;font-size:9px;font-weight:950;letter-spacing:.1em}.login-submit:disabled{opacity:.55;cursor:wait}.login-submit span{font-size:16px}.admin-login-card small{display:block;color:#555;font-size:8px;line-height:1.5;margin-top:18px}.admin-denied{max-width:850px}.admin-denied h1{max-width:760px}.admin-denied button{max-width:250px}.admin-denied>span{display:block}.admin-denied button{margin-top:28px;justify-content:center}@media(max-width:760px){.admin-header{align-items:flex-start}.admin-header-actions{display:grid;justify-items:end;gap:9px}.admin-login-section{grid-template-columns:1fr;padding-top:50px!important}.admin-login-copy h1{font-size:52px}.admin-login-card{padding:24px;box-shadow:9px 9px 0 #050506}.admin-page section{padding:50px 5vw}.admin-title{align-items:center}.admin-title h1{font-size:42px}}
      `}</style>
    </main>
  );
}
