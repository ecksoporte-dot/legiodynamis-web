// functions/api/chat.js
// Cloudflare Pages Function -> POST /api/chat
// Recibe { messages: [{role:"user"|"assistant", text:"..."}] } desde el widget del sitio,
// llama a la API de Gemini con la key guardada en la variable de entorno GEMINI_API_KEY
// (Cloudflare Pages > Settings > Environment variables, tipo "Secret"), y devuelve { reply }.
//
// La key NUNCA se expone al navegador: solo vive en este código server-side.

const SYSTEM_PROMPT = `Eres el asistente de mesa de ayuda de Legiodynamis, una empresa de servicios TI en Lima, Perú, especializada en Windows Server, VMware, Azure/Microsoft 365, automatización con PowerShell y ciberseguridad (hardening, control de accesos, respaldos contra ransomware, publicación segura de aplicaciones).

Tu trabajo:
- Responder preguntas básicas y generales sobre estos servicios, cómo funcionan, y sobre los planes publicados en la web:
  - Esencial: S/ 900–1200/mes (soporte remoto puntual, revisión básica de servidores).
  - Profesional: S/ 1800–2800/mes (monitoreo continuo, atención prioritaria, automatización y documentación).
  - A medida: cotizable (proyectos, migraciones, acompañamiento amplio).
- Ser breve, claro y directo. Nada de tecnicismos innecesarios ni respuestas largas.
- Si la consulta requiere diagnóstico específico del entorno del usuario, una cotización real, una migración concreta, o cualquier cosa que dependa de ver su infraestructura, NO improvises una solución. Dile con claridad que eso lo debe ver el especialista directamente, y sugiere dejar sus datos en el formulario de la sección "Contacto" de la web o escribir a contacto@legiodynamis.com.
- No inventes precios exactos, plazos ni compromisos que no estén explícitos arriba.
- Si preguntan por seguridad de su empresa, explica el enfoque en términos generales y deriva a una revisión con el especialista. Nunca pidas ni aceptes contraseñas, claves, IPs internas ni datos sensibles en el chat; si el usuario los comparte, indícale que no los envíe por ese medio.
- No des instrucciones técnicas paso a paso para resolver un problema en producción; para eso deriva a contacto.
- Tono profesional, cercano, sin promesas exageradas — igual que el resto del sitio.
- Responde siempre en español.`;

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.GEMINI_API_KEY) {
    return jsonResponse(
      { error: "Falta configurar GEMINI_API_KEY en las variables de entorno del proyecto." },
      500
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "JSON inválido en la solicitud." }, 400);
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  if (incoming.length === 0) {
    return jsonResponse({ error: "Falta el campo 'messages'." }, 400);
  }

  // Límite de turnos por solicitud, para controlar costo y abuso.
  const trimmed = incoming.slice(-16);

  // Formato Gemini: role "user" | "model", contenido en "parts"
  const contents = trimmed.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.text || "").slice(0, 2000) }],
  }));

  const MODELS = ["gemini-3.8-flash", "gemini-3.7-flash"];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  let geminiRes;
  try {
    geminiRes = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.4,
        },
      }),
    });
  } catch (err) {
    return jsonResponse({ error: "No se pudo contactar al servicio de IA." }, 502);
  }

  if (!geminiRes.ok) {
    const detail = await geminiRes.text().catch(() => "");
    return jsonResponse(
      { error: "El servicio de IA devolvió un error.", detail: detail.slice(0, 500) },
      502
    );
  }

  const data = await geminiRes.json();
  const reply =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() ||
    "No pude generar una respuesta. Intenta de nuevo o usa el formulario de contacto.";

  return jsonResponse({ reply });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
