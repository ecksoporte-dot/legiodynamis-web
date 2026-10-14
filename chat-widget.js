(function () {
  "use strict";

  var MAX_TURNS = 14; // límite de mensajes por sesión (control de costo/abuso en el cliente)
  var messages = []; // [{role:"user"|"assistant", text:string}]

  var css = "" +
    "#ld-chat-btn{position:fixed;bottom:20px;right:20px;width:58px;height:58px;border-radius:9999px;" +
    "background:#E95A4E;color:#fff;border:none;box-shadow:0 12px 28px rgba(15,23,42,.28);cursor:pointer;" +
    "display:flex;align-items:center;justify-content:center;z-index:9999;transition:transform .15s ease;}" +
    "#ld-chat-btn:hover{transform:scale(1.06);}" +
    "#ld-chat-win{position:fixed;bottom:90px;right:20px;width:min(360px,92vw);height:min(520px,72vh);" +
    "background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(15,23,42,.28);display:none;" +
    "flex-direction:column;overflow:hidden;z-index:9999;font-family:Inter,system-ui,sans-serif;" +
    "border:1px solid rgba(15,23,42,.08);}" +
    "#ld-chat-win.open{display:flex;}" +
    "#ld-chat-head{background:#0f172a;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;}" +
    "#ld-chat-head div.title{font-weight:700;font-size:.95rem;}" +
    "#ld-chat-head div.sub{font-size:.72rem;color:rgba(255,255,255,.6);margin-top:2px;}" +
    "#ld-chat-close{background:transparent;border:none;color:#fff;cursor:pointer;padding:4px;opacity:.8;}" +
    "#ld-chat-close:hover{opacity:1;}" +
    "#ld-chat-body{flex:1;overflow-y:auto;padding:14px;background:#f8fafc;display:flex;flex-direction:column;gap:10px;}" +
    ".ld-msg{max-width:82%;padding:9px 12px;border-radius:14px;font-size:.86rem;line-height:1.45;white-space:pre-wrap;}" +
    ".ld-msg.user{align-self:flex-end;background:#E95A4E;color:#fff;border-bottom-right-radius:4px;}" +
    ".ld-msg.bot{align-self:flex-start;background:#fff;color:#0f172a;border:1px solid rgba(15,23,42,.08);border-bottom-left-radius:4px;}" +
    ".ld-msg.typing{align-self:flex-start;color:#94a3b8;font-style:italic;font-size:.8rem;}" +
    "#ld-chat-quote{margin:0 14px 10px;padding:9px 12px;border-radius:12px;background:#fdece9;color:#B93832;" +
    "font-size:.8rem;font-weight:600;text-align:center;text-decoration:none;display:block;}" +
    "#ld-chat-quote:hover{background:#fbdcd8;}" +
    "#ld-chat-form{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(15,23,42,.08);background:#fff;}" +
    "#ld-chat-input{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:9px 11px;font-size:.85rem;" +
    "font-family:inherit;outline:none;resize:none;}" +
    "#ld-chat-input:focus{border-color:#E95A4E;}" +
    "#ld-chat-send{background:#0f172a;color:#fff;border:none;border-radius:10px;width:38px;flex:none;cursor:pointer;" +
    "display:flex;align-items:center;justify-content:center;}" +
    "#ld-chat-send:disabled{opacity:.5;cursor:default;}" +
    "@media (max-width:480px){#ld-chat-win{right:10px;left:10px;width:auto;bottom:82px;}#ld-chat-btn{right:16px;bottom:16px;}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var ICON_CHAT =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var ICON_CLOSE =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  var ICON_SEND =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';

  var btn = document.createElement("button");
  btn.id = "ld-chat-btn";
  btn.setAttribute("aria-label", "Abrir mesa de ayuda");
  btn.innerHTML = ICON_CHAT;

  var win = document.createElement("div");
  win.id = "ld-chat-win";
  win.innerHTML =
    '<div id="ld-chat-head">' +
    '<div><div class="title">Mesa de ayuda</div><div class="sub">Respuesta automática · Legiodynamis</div></div>' +
    '<button id="ld-chat-close" aria-label="Cerrar">' + ICON_CLOSE + "</button>" +
    "</div>" +
    '<div id="ld-chat-body"></div>' +
    '<a id="ld-chat-quote" href="/#contacto">Prefiero solicitar una cotización →</a>' +
    '<form id="ld-chat-form">' +
    '<textarea id="ld-chat-input" rows="1" placeholder="Escribe tu consulta..."></textarea>' +
    '<button id="ld-chat-send" type="submit" aria-label="Enviar">' + ICON_SEND + "</button>" +
    "</form>";

  document.addEventListener("DOMContentLoaded", function () {
    document.body.appendChild(btn);
    document.body.appendChild(win);

    var body = win.querySelector("#ld-chat-body");
    var form = win.querySelector("#ld-chat-form");
    var input = win.querySelector("#ld-chat-input");
    var send = win.querySelector("#ld-chat-send");
    var closeBtn = win.querySelector("#ld-chat-close");

    function addBubble(role, text) {
      var el = document.createElement("div");
      el.className = "ld-msg " + (role === "user" ? "user" : "bot");
      el.textContent = text; // textContent evita inyección de HTML
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }

    function greet() {
      if (body.children.length === 0) {
        addBubble(
          "assistant",
          "Hola 👋 Soy la mesa de ayuda automática de Legiodynamis. Puedo resolver dudas básicas sobre Windows Server, VMware, Azure/M365, automatización y nuestros planes. Para diagnósticos o cotizaciones puntuales, te derivo directo al equipo."
        );
      }
    }

    btn.addEventListener("click", function () {
      win.classList.toggle("open");
      if (win.classList.contains("open")) {
        greet();
        input.focus();
      }
    });
    closeBtn.addEventListener("click", function () {
      win.classList.remove("open");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;

      if (messages.length >= MAX_TURNS) {
        addBubble(
          "assistant",
          "Hemos llegado al límite de esta conversación automática. Por favor usa el formulario de contacto para continuar con un especialista."
        );
        return;
      }

      addBubble("user", text);
      messages.push({ role: "user", text: text });
      input.value = "";
      input.style.height = "auto";
      send.disabled = true;

      var typing = addBubble("assistant", "Escribiendo...");
      typing.classList.add("typing");

      fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: messages }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          typing.remove();
          var reply = data && data.reply ? data.reply : "No pude responder. Intenta de nuevo o escribe a contacto@legiodynamis.com.";
          addBubble("assistant", reply);
          messages.push({ role: "assistant", text: reply });
        })
        .catch(function () {
          typing.remove();
          addBubble("assistant", "Hubo un problema de conexión. Intenta de nuevo en un momento.");
        })
        .finally(function () {
          send.disabled = false;
        });
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
    input.addEventListener("input", function () {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 96) + "px";
    });
  });
})();
