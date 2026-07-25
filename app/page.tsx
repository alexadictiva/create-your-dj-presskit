"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { TemplateMockup } from "@/src/components/press-kit/TemplateMockup";
import placeholderDj from "@/src/assets/images/placeholder-dj.webp";
import { equipment, formSteps, genres, initialForm, templates } from "@/src/data/press-kit";
import {
  createPressKitPdf,
  IMAGE_UPLOAD_RULES,
  validatePressKitImages,
} from "@/src/lib/press-kit-pdf";
import type { PressKitFormData, TemplateId } from "@/src/types/press-kit";

const placeholderDjSrc =
  typeof placeholderDj === "string" ? placeholderDj : placeholderDj.src;

function scrollToBuilder() {
  document.getElementById("crear")?.scrollIntoView({ behavior: "smooth" });
}

function toggleItem(list: string[], item: string) {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

export default function Home() {
  const [template, setTemplate] = useState<TemplateId>("pulse");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PressKitFormData>(initialForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === template) ?? templates[0],
    [template],
  );

  function updateField(field: keyof PressKitFormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectTemplate(id: TemplateId) {
    setTemplate(id);
    document.documentElement.style.setProperty(
      "--accent",
      templates.find((item) => item.id === id)?.accent ?? "#b7ff3c",
    );
  }

  async function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) return;

    const { accepted, errors: imageErrors } =
      await validatePressKitImages(selectedFiles);

    if (accepted.length > 0) {
      photoUrls.forEach((url) => URL.revokeObjectURL(url));
      setPhotos(accepted);
      setPhotoUrls(accepted.map((file) => URL.createObjectURL(file)));
    }

    setErrors(imageErrors);
    event.target.value = "";
  }

  function validate(currentStep = step) {
    const missing: string[] = [];
    if (currentStep === 0) {
      if (!form.artistName.trim()) missing.push("Nombre artístico");
      if (!form.realName.trim()) missing.push("Nombre real");
      if (!form.city.trim()) missing.push("Ciudad");
      if (!form.email.trim()) missing.push("Email");
      if (!form.phone.trim()) missing.push("Teléfono");
      if (form.biography.trim().length < 80) missing.push("Biografía (mínimo 80 caracteres)");
    }
    if (currentStep === 1) {
      if (!form.experiences.trim()) missing.push("Experiencia");
      if (!form.genres.length) missing.push("Al menos un género");
      if (!form.equipment.length) missing.push("Al menos un equipo");
    }
    if (currentStep === 2) {
      if (!form.instagram.trim()) missing.push("Instagram");
      if (!form.soundcloud.trim()) missing.push("SoundCloud / Mixcloud");
      if (!form.website.trim()) missing.push("Sitio web");
      if (!photos.length) missing.push("Al menos una foto");
    }
    setErrors(missing);
    return missing.length === 0;
  }

  function nextStep() {
    if (!validate()) return;
    setErrors([]);
    setStep((current) => Math.min(current + 1, 2));
  }

  async function persistPressKit() {
    const payload = { ...form, template, createdAt: new Date().toISOString() };
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseKey);
      const uploaded: string[] = [];
      for (const photo of photos) {
        const path = `${crypto.randomUUID()}-${photo.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
        const { error } = await supabase.storage.from("presskit-media").upload(path, photo);
        if (error) throw error;
        uploaded.push(supabase.storage.from("presskit-media").getPublicUrl(path).data.publicUrl);
      }
      const { error } = await supabase.from("djs").insert({ ...payload, photos: uploaded });
      if (error) throw error;
      return;
    }

    const body = new globalThis.FormData();
    body.append("payload", JSON.stringify(payload));
    photos.forEach((photo) => body.append("photos", photo));
    const response = await fetch("/api/presskits", { method: "POST", body });
    if (!response.ok) throw new Error("No se pudo guardar el press kit");
  }

  async function generatePdf() {
    await createPressKitPdf(form, template, photos);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate(2)) return;
    setIsGenerating(true);
    try {
      await persistPressKit();
      await generatePdf();
      setSuccess(true);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Ocurrió un error inesperado"]);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#top" aria-label="Kitbeat inicio"><span>KIT</span>BEAT<i>.</i></a>
        <div className="nav-links">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#plantillas">Plantillas</a>
          <a href="#faq">FAQ</a>
        </div>
        <button className="nav-cta" onClick={scrollToBuilder}>Crear mi kit <span>↗</span></button>
      </nav>

      <section className="hero" id="top">
        <div className="hero-grid" />
        <div className="hero-orb" />
        <div className="eyebrow"><span>●</span> TU CARRERA. BIEN PRESENTADA.</div>
        <h1>HACÉ QUE<br /><em>TE RECUERDEN.</em></h1>
        <p>Creá un press kit profesional que hable por vos. Sin diseñadores, sin vueltas. Listo para enviar en minutos.</p>
        <div className="hero-actions">
          <button className="primary-btn" onClick={scrollToBuilder}>CREAR MI PRESS KIT <span>→</span></button>
          <span className="microcopy">GRATIS PARA EMPEZAR<br />NO REQUIERE TARJETA</span>
        </div>
        <div className="hero-visual">
          <div className="hero-sticker">READY<br />TO BOOK</div>
          <div className="hero-card back"><TemplateMockup template="voltage" compact /></div>
          <div className="hero-card front"><TemplateMockup template="pulse" compact /></div>
          <div className="soundline">{Array.from({ length: 44 }).map((_, index) => <i key={index} style={{ height: `${8 + ((index * 17) % 48)}px` }} />)}</div>
        </div>
        <div className="hero-foot">
          <span>HECHO PARA DJS<br />QUE VAN EN SERIO.</span>
          <span>↓ SCROLL TO DROP</span>
        </div>
      </section>

      <section className="manifesto">
        <div className="marquee">NO ES UN PDF. ES TU PRÓXIMO BOOKING. ✦ NO ES UN PDF. ES TU PRÓXIMO BOOKING. ✦</div>
        <div className="manifesto-inner">
          <p className="section-label">[ EL PROBLEMA ]</p>
          <h2>Tu música puede ser increíble.<br /><span>Tu presentación también.</span></h2>
          <div className="manifesto-copy">
            <p>Los bookers reciben cientos de perfiles por semana. Kitbeat ordena tu historia, tu sonido y tu identidad en una pieza que da ganas de abrir.</p>
            <div className="proof"><strong>03</strong><span>PLANTILLAS<br />PROFESIONALES</span></div>
            <div className="proof"><strong>05'</strong><span>PARA TENERLO<br />LISTO</span></div>
          </div>
        </div>
      </section>

      <section className="steps-section" id="como-funciona">
        <p className="section-label light">[ CÓMO FUNCIONA ]</p>
        <h2>TRES PASOS.<br /><em>UN KIT QUE PEGA.</em></h2>
        <div className="steps-grid">
          <article><span>01</span><div className="step-icon">＋</div><h3>CONTANOS QUIÉN SOS</h3><p>Tu bio, trayectoria, géneros, residencias y todo lo que hace único a tu sonido.</p></article>
          <article><span>02</span><div className="step-icon">◫</div><h3>ELEGÍ TU ESTILO</h3><p>Tres direcciones visuales inspiradas en la cultura club. Personalizá el color y la energía.</p></article>
          <article><span>03</span><div className="step-icon">↓</div><h3>DESCARGÁ Y ENVIÁ</h3><p>Tu PDF sale listo para bookers, clubs, festivales y agencias. Profesional desde el primer envío.</p></article>
        </div>
      </section>

      <section className="templates-section" id="plantillas">
        <div className="templates-heading">
          <div><p className="section-label">[ TU ESTILO, TU KIT ]</p><h2>Elegí tu<br /><em>frecuencia.</em></h2></div>
          <p>Cada plantilla está diseñada para leerse rápido, verse impecable y hacer que tu identidad ocupe el centro.</p>
        </div>
        <div className="template-grid">
          {templates.map((item) => (
            <button
              className={`template-card ${template === item.id ? "selected" : ""}`}
              key={item.id}
              onClick={() => { selectTemplate(item.id); scrollToBuilder(); }}
            >
              <div className="template-meta"><span>{item.number}</span><span>{item.name}</span></div>
              <TemplateMockup template={item.id} />
              <div className="template-caption"><span>{item.description}</span><b>{template === item.id ? "SELECCIONADA ✓" : "ELEGIR →"}</b></div>
            </button>
          ))}
        </div>
      </section>

      <section className="builder-section" id="crear">
        <div className="builder-heading">
          <p className="section-label light">[ CREÁ TU PRESS KIT ]</p>
          <h2>Tu historia.<br /><em>En modo headliner.</em></h2>
          <p>Todo lo que cargues se transforma en un PDF profesional y queda guardado para tu gestión.</p>
        </div>

        <div className="builder-shell">
          <div className="form-panel">
            <div className="progress">
              {formSteps.map((item, index) => (
                <button key={item.number} className={index <= step ? "active" : ""} onClick={() => index < step && setStep(index)}>
                  <span>{item.number}</span>{item.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit}>
              {step === 0 && (
                <div className="form-step">
                  <div className="form-kicker">PASO 01 / IDENTIDAD</div>
                  <h3>Empecemos por vos.</h3>
                  <div className="field-grid">
                    <label><span>Nombre artístico *</span><input value={form.artistName} onChange={(e) => updateField("artistName", e.target.value)} placeholder="Ej. LUMA" /></label>
                    <label><span>Nombre real *</span><input value={form.realName} onChange={(e) => updateField("realName", e.target.value)} placeholder="Tu nombre y apellido" /></label>
                    <label><span>Ciudad / País *</span><input value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Buenos Aires, AR" /></label>
                    <label><span>Email de booking *</span><input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="booking@tudominio.com" /></label>
                    <label className="wide"><span>Teléfono / WhatsApp *</span><input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+54 9 11..." /></label>
                    <label className="wide"><span>Biografía artística *</span><textarea value={form.biography} onChange={(e) => updateField("biography", e.target.value)} placeholder="Contá tu historia, influencias y propuesta sonora. Mínimo 80 caracteres." rows={6} /><small>{form.biography.length}/80 mínimo</small></label>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="form-step">
                  <div className="form-kicker">PASO 02 / TRAYECTORIA</div>
                  <h3>¿Cómo suena tu mundo?</h3>
                  <fieldset>
                    <legend>Géneros musicales *</legend>
                    <div className="chips">{genres.map((item) => <button type="button" key={item} className={form.genres.includes(item) ? "on" : ""} onClick={() => setForm((current) => ({ ...current, genres: toggleItem(current.genres, item) }))}>{item}<span>{form.genres.includes(item) ? "×" : "+"}</span></button>)}</div>
                  </fieldset>
                  <label><span>Experiencias, venues y logros *</span><textarea value={form.experiences} onChange={(e) => updateField("experiences", e.target.value)} placeholder={"Ej. Crobar — Buenos Aires — 2025\nFestival XYZ — Main Stage — 2024\nResidencia en Club..." } rows={7} /></label>
                  <fieldset>
                    <legend>Equipos con los que trabajás *</legend>
                    <div className="chips equipment">{equipment.map((item) => <button type="button" key={item} className={form.equipment.includes(item) ? "on" : ""} onClick={() => setForm((current) => ({ ...current, equipment: toggleItem(current.equipment, item) }))}>{item}<span>{form.equipment.includes(item) ? "×" : "+"}</span></button>)}</div>
                  </fieldset>
                </div>
              )}

              {step === 2 && (
                <div className="form-step">
                  <div className="form-kicker">PASO 03 / MEDIA & SETUP</div>
                  <h3>Últimos detalles.</h3>
                  <div className="field-grid">
                    <label><span>Instagram *</span><input value={form.instagram} onChange={(e) => updateField("instagram", e.target.value)} placeholder="@tuperfil" /></label>
                    <label><span>SoundCloud / Mixcloud *</span><input value={form.soundcloud} onChange={(e) => updateField("soundcloud", e.target.value)} placeholder="soundcloud.com/tuperfil" /></label>
                    <label className="wide"><span>Sitio web o link principal *</span><input value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://tusitio.com" /></label>
                  </div>
                  <label className="upload-zone">
                    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotos} />
                    <span className="upload-icon">＋</span>
                    <strong>SUBÍ TUS MEJORES FOTOS *</strong>
                    <small>
                      Entre {IMAGE_UPLOAD_RULES.minCount} y {IMAGE_UPLOAD_RULES.maxCount} fotos ·
                      mínimo {IMAGE_UPLOAD_RULES.minWidth}×{IMAGE_UPLOAD_RULES.minHeight} px ·
                      máximo {IMAGE_UPLOAD_RULES.maxWidth}×{IMAGE_UPLOAD_RULES.maxHeight} px ·
                      10 MB cada una
                    </small>
                    <b>SELECCIONAR ARCHIVOS</b>
                  </label>
                  {photoUrls.length > 0 && <div className="photo-strip">{photoUrls.map((url, index) => <img key={url} src={url} alt={`Foto cargada ${index + 1}`} />)}</div>}
                  <div className="selected-kit"><TemplateMockup template={template} compact /><div><span>PLANTILLA ELEGIDA</span><strong>{selectedTemplate.name}</strong><button type="button" onClick={() => document.getElementById("plantillas")?.scrollIntoView({ behavior: "smooth" })}>CAMBIAR</button></div></div>
                </div>
              )}

              {errors.length > 0 && <div className="form-errors" role="alert"><b>Revisá estos campos:</b> {errors.join(" · ")}</div>}

              <div className="form-actions">
                {step > 0 && <button type="button" className="back-btn" onClick={() => { setErrors([]); setStep((current) => current - 1); }}>← ATRÁS</button>}
                {step < 2
                  ? <button type="button" className="next-btn" onClick={nextStep}>CONTINUAR <span>→</span></button>
                  : <button type="submit" className="next-btn generate" disabled={isGenerating}>{isGenerating ? "GENERANDO..." : "GENERAR MI PRESS KIT"} <span>↓</span></button>}
              </div>
            </form>
          </div>

          <aside className="preview-panel">
            <div className="preview-label"><span>●</span> VISTA PREVIA EN VIVO</div>
            <div className="live-preview" style={{ "--preview-accent": selectedTemplate.accent } as React.CSSProperties}>
              {photoUrls[0] ? (
                <img src={photoUrls[0]} alt="" />
              ) : (
                <img
                  className="preview-person"
                  src={placeholderDjSrc}
                  alt="Vista previa del retrato del DJ"
                  decoding="async"
                />
              )}
              <div className="live-template">{selectedTemplate.name} / 2026</div>
              <h4>{form.artistName || "NOMBRE"}</h4>
              <p>{form.city || "TU CIUDAD"} · {(form.genres[0] || "TU GÉNERO").toUpperCase()}</p>
              <div className="preview-rule" />
              <small>{form.biography || "Tu biografía y propuesta artística aparecerán acá mientras completás el formulario."}</small>
              <div className="preview-tags">{form.genres.slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div>
            </div>
            <p>Así se está viendo tu primera página. El PDF final incluye biografía, experiencia, setup y contacto.</p>
          </aside>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <p className="section-label">[ PREGUNTAS FRECUENTES ]</p>
        <div className="faq-title"><h2>Antes de<br /><em>salir a escena.</em></h2><p>Todo lo que necesitás saber para crear y usar tu press kit.</p></div>
        <div className="faq-list">
          <details><summary>¿Qué incluye el PDF final?<span>＋</span></summary><p>Portada, biografía, estilos musicales, experiencia, equipamiento, fotografías y datos de contacto, con el diseño que elegiste.</p></details>
          <details><summary>¿Puedo actualizarlo después?<span>＋</span></summary><p>Sí. La información queda almacenada y el equipo administrador puede gestionar los perfiles generados.</p></details>
          <details><summary>¿Las fotos pierden calidad?<span>＋</span></summary><p>No. Recomendamos imágenes JPG o PNG de al menos 1600 px de ancho para un resultado nítido.</p></details>
          <details><summary>¿Sirve para enviar a festivales?<span>＋</span></summary><p>Sí. El formato está pensado para bookers, clubs, agencias, festivales y prensa.</p></details>
        </div>
      </section>

      <footer>
        <div className="footer-cta"><span>¿LISTO PARA EL PRÓXIMO BOOKING?</span><h2>QUE TU KIT<br /><em>HAGA RUIDO.</em></h2><button className="primary-btn" onClick={scrollToBuilder}>CREAR MI PRESS KIT <span>→</span></button></div>
        <div className="footer-bottom"><a className="brand" href="#top"><span>KIT</span>BEAT<i>.</i></a><p>Press kits para DJs que van en serio.</p><div><a href="#como-funciona">CÓMO FUNCIONA</a><a href="#plantillas">PLANTILLAS</a><a href="/admin">ADMIN</a></div><small>© 2026 KITBEAT</small></div>
      </footer>

      {isGenerating && <div className="loading-overlay"><div className="loader"><i /><i /><i /><i /><i /></div><strong>MEZCLANDO TU PRESS KIT...</strong><span>Estamos armando algo que suena a vos.</span></div>}
      {success && <div className="success-overlay" onClick={() => setSuccess(false)}><div className="success-card" onClick={(e) => e.stopPropagation()}><button onClick={() => setSuccess(false)} aria-label="Cerrar">×</button><span className="success-icon">✓</span><p>PRESS KIT GENERADO</p><h3>Ya estás listo<br /><em>para sonar.</em></h3><span>Tu PDF se descargó correctamente y tu información quedó guardada.</span><button className="primary-btn" onClick={() => setSuccess(false)}>VOLVER AL SITIO</button></div></div>}
    </main>
  );
}
