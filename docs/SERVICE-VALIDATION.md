# Validación de servicios

Lista para probar Melcochat antes de fusionar a `master`. Marca cada casilla al confirmarla.

## 1. Inicio de sesión real (chats de IA principales)

Para cada servicio: añade **dos cuentas** distintas y comprueba que no se mezclan.

| Servicio | Inicia sesión | 2.ª cuenta aislada | Sigue abierta tras reiniciar | Notificaciones | Notas |
|---|---|---|---|---|---|
| ChatGPT | [ ] | [ ] | [ ] | n/a | |
| Claude | [ ] | [ ] | [ ] | n/a | Cloudflare puede pedir verificación la primera vez |
| Gemini | ✗ | — | — | n/a | Google bloquea el inicio de sesión en navegadores integrados (ver abajo) |
| Venice | [ ] | [ ] | [ ] | n/a | |

Prueba también el inicio con **"Continuar con Google / Apple / Microsoft"** en ChatGPT y Claude: la ventana emergente debe abrirse dentro de la app y volver con la sesión iniciada.

### Google: limitación conocida

Probado el 14-11-2026: Google responde "Couldn't sign you in — This browser or app may not be secure" con cualquier identidad de navegador:

- Chrome con Firefox solo en las cabeceras (la versión original);
- Chrome completo con la marca "Google Chrome";
- Firefox coherente en cabeceras y JavaScript, con y sin las huellas de Chrome.

Afecta a Gemini, Gmail, NotebookLM, Drive, YouTube y al botón "Continuar con Google" de otros servicios. La app detecta esa página y ofrece abrir el servicio en el navegador normal.

Google decide por riesgo: un inicio de sesión a veces pasa (NotebookLM am20 entró con la primera versión). Muchos intentos fallidos seguidos desde la misma IP lo empeoran durante horas o días. Solución: con una cuenta de Google ya iniciada, poner las demás de esa misma cuenta en *Edit → Session → Shared with …*.

- [ ] Gemini compartiendo la sesión de NotebookLM entra sin iniciar sesión
- [ ] Al llegar a la página de rechazo aparece el aviso con "Open in Browser"
- [ ] "Open in Browser" abre el servicio en el navegador predeterminado

## 2. Mensajería y correo

| Servicio | Inicia sesión | Contador de no leídos | Notificación nativa | Clic en notificación abre la cuenta |
|---|---|---|---|---|
| WhatsApp | [ ] | [ ] | [ ] | [ ] |
| Telegram | [ ] | [ ] | [ ] | [ ] |
| Slack | [ ] | [ ] | [ ] | [ ] |
| Discord | [ ] | [ ] | [ ] | [ ] |
| Gmail | [ ] | [ ] | [ ] | [ ] |
| Outlook | [ ] | [ ] | [ ] | [ ] |

## 3. Funciones de la app

- [ ] Cerrar sesión de una cuenta no afecta a la otra cuenta del mismo servicio
- [ ] Hibernar y despertar una cuenta conserva la sesión
- [ ] Zoom por cuenta se recuerda tras reiniciar
- [ ] No molestar silencia todas las notificaciones
- [ ] Cerrar a la bandeja y volver a abrir desde el icono
- [ ] Iniciar con el sistema
- [ ] Llamada de voz/vídeo en Teams o Meet (permiso de cámara y micrófono)
- [ ] Compartir pantalla

## 4. Plataformas e instaladores

| | Compila | Se instala | Abre | Inicio de sesión |
|---|---|---|---|---|
| Windows (NSIS + portable) | [x] | [ ] | [x] | [ ] |
| macOS (dmg) | CI | [ ] | [ ] | [ ] |
| Linux (AppImage / deb) | CI | [ ] | [ ] | [ ] |

Los builds de macOS no están firmados: al abrir la primera vez, clic derecho → Abrir.

## 5. Resultado de la prueba automática de carga (72 URLs)

65 cargaron bien. Estos mostraron una verificación anti-bots sin sesión iniciada y hay que revisarlos a mano:

- Le Chat (Cloudflare 403)
- DeepSeek (405 "confirm you are human")
- Character.AI (Cloudflare)
- GitLab (Cloudflare)
- T3 Chat (Vercel 429)
- WeChat (carga lenta)

URLs que redirigen y conviene actualizar en el catálogo:

- LMArena → `arena.ai`
- NotebookLM → `notebook.google.com`
