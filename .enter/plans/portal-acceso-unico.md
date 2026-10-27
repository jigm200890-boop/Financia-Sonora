# Portal de Acceso Único — Financia Sonora

## 1. Lo que encontré (estado real, sin adornos)

**El proyecto actual no contiene nada del portal.** Es la plantilla de arranque: una pantalla de bienvenida genérica ("Your App Name") y la librería de componentes visuales. No hay menú lateral, ni aplicaciones, ni agentes, ni base de datos, ni inicio de sesión. No hay nada que "ya sirva" como base funcional, pero sí es un punto de partida limpio y sin deuda: se puede construir el portal completo encima sin arrastrar restos.

**Los tres núcleos que enviaste, revisados:**

| Núcleo | Enlace | Estado real al consultarlo |
|---|---|---|
| Núcleo Central Operativo — Base44 | app pública + constructor | Abre, pero **exige iniciar sesión** (Google/correo). No se puede ver contenido sin credenciales. |
| Centro de Control — Hércules | `centro-de-control-799208.onhercules.app` | **Público y activo.** Ya muestra un directorio de aplicaciones, agentes de IA, operaciones e integraciones, con el lema "sin credenciales guardadas, sin estados simulados". |
| NEXO CENTRAL — Hércules | `01m5j2...hercules-dev.com` | Responde, pero es **preview privado: solo miembros de la organización** pueden entrar. |

Consecuencia importante: el Centro de Control ya cubre una parte de lo que describes (directorio de apps, agentes, tareas, integraciones). Por eso el portal **no lo reemplaza ni lo reconstruye**: lo integra como un núcleo más y añade lo que ese sistema no tiene — acceso unificado, base de conocimiento permanente, chat central y administración de cuentas.

## 2. Qué se va a construir

Un portal propio, con backend real (base de datos, sesiones y almacenamiento), tema oscuro profesional con acento ámbar, navegación lateral fija de once secciones y diseño responsive (escritorio y móvil). No se reescribe ninguno de los tres núcleos: siguen funcionando como sistemas independientes y se abren desde el portal.

### Acceso
- Inicio de sesión propio del portal con correo y contraseña, sesión persistente y cierre de sesión.
- Tres niveles de permiso: administrador, colaborador y solo lectura. El administrador ve y edita todo; el colaborador trabaja en apps, conocimiento, tareas, chat y flujos; solo lectura consulta sin modificar.

### Inicio
- Vista general: total de aplicaciones por estado, núcleos disponibles, agentes registrados, tareas abiertas y actividad reciente.
- Accesos directos a los tres núcleos y aviso de qué requiere inicio de sesión externo.

### Aplicaciones
- Tarjetas con: nombre, plataforma (Base44, Hércules u otra), cuenta propietaria, función, estado (activa / desconectada / pendiente), última verificación y listado de funciones disponibles y pendientes.
- Botones "Abrir aplicación" y "Abrir constructor" (el segundo solo aparece si la app tiene constructor registrado), siempre en pestaña nueva.
- Alta, edición, archivo y eliminación de aplicaciones; búsqueda y filtros por plataforma, cuenta, función y estado.
- Las tres aplicaciones y los tres núcleos de arriba vienen precargados con sus enlaces reales. El correo de la cuenta propietaria queda como "por definir" y editable: no lo conozco y no lo voy a inventar.
- **Verificación de conexión real:** al pulsar "Verificar" el portal consulta el sistema desde el servidor y registra la hora. El resultado es honesto: "alcanzable", "requiere inicio de sesión" o "no disponible". Nunca muestra "conectada" cuando no lo está.

### Núcleos
- Ficha de cada núcleo central con su función, sus enlaces de acceso, su estado verificado y notas de acceso (por ejemplo, que NEXO solo admite miembros de la organización).

### Agentes IA
- Registro de agentes: nombre, proveedor (ChatGPT, Claude, otro), función, responsabilidades, herramientas autorizadas, acceso al conocimiento compartido (sí/no) y estado.
- Ficha de agente con su historial de actividad y las tareas que tiene asignadas.

### Conocimiento
- Administrador de carpetas y documentos con editor de texto enriquecido, etiquetas, autor, fecha de actualización y búsqueda.
- Todo se guarda en la base del portal, independiente de las conversaciones, y sobrevive aunque se borre un chat.

### Chat central (con IA real)
- Una sola interfaz para conversar con los agentes registrados; cada conversación queda guardada con su historial y puede retomarse después.
- Respuestas generadas por un modelo de IA a través del backend del portal (la clave del modelo nunca queda expuesta en el navegador).
- Desde un mensaje se puede crear una tarea o guardar una decisión en Conocimiento, para que el trabajo no se pierda en el chat.
- Si el modelo no responde o falla, el mensaje se marca como error y se puede reintentar; no se simulan respuestas.

### Tareas
- Tablero y lista con título, responsable, prioridad, estado, fecha y vínculo a una aplicación, un agente o un flujo.
- Filtros por responsable y estado, y contador de pendientes en el menú.

### Flujos de trabajo
- Procesos con nombre, objetivo, responsable y pasos ordenados (quién hace qué, en qué orden, con qué app o agente).
- Vista de diagrama del flujo generada a partir de los pasos, para leerlo de un vistazo.
- El lienzo libre con nodos arrastrables y conexiones dibujadas a mano queda para una fase posterior (ver sección 4).

### Integraciones
- Inventario de conexiones: servicio, tipo (API, enlace autorizado o solo informativo), estado, responsable, última sincronización y notas.
- Verificación desde el servidor con el mismo criterio honesto que en Aplicaciones.
- Se registra lo que existe; no se simula intercambio de datos con plataformas que no expongan una API autorizada.

### Cuentas y usuarios
- Directorio de correos y cuentas por plataforma (Base44, Hércules, otras), con su función, permisos y apps asociadas.
- Administración de los usuarios del portal y su nivel de permiso.

### Configuración
- Datos del portal (nombre, identidad visual), preferencias de tema, y gestión de usuarios y permisos.
- Registro de las últimas verificaciones y de los cambios importantes.

## 3. Límites que el portal respeta (importante)

- **No se guardan contraseñas de terceros.** El portal guarda correos y notas de acceso, nunca claves de Base44, Hércules o NEXO. No hay "acceso automático" a esas plataformas: al abrirlas, cada una pide su propio inicio de sesión.
- **La verificación confirma alcance, no contenido.** Sabremos si el sistema responde y si exige sesión; no se leerán datos privados de apps que no autorizan API.
- **No se promete inicio de sesión único hacia las apps externas.** Solo el portal tiene sesión única propia; las integraciones autorizadas se añadirán cuando existan.
- **Los núcleos no se modifican ni se migran.** Se enlazan y se supervisan.

## 4. Fuera de esta entrega (fase siguiente)

- Lienzo de flujos con arrastre libre y conexiones dibujadas.
- Diagramas y mapas conceptuales dentro de Conocimiento.
- Sincronización bidireccional por API con Base44 o Hércules (requiere credenciales y permisos que esas plataformas deben conceder).
- Inicio de sesión único (Google u otro proveedor) hacia el portal.

## 5. Resultado observable

- [ ] Entro con mi correo y contraseña, y la sesión se mantiene al recargar.
- [ ] Veo las tres aplicaciones y los tres núcleos precargados con sus enlaces reales, y "Abrir aplicación" los abre en pestaña nueva.
- [ ] "Verificar" produce un estado y una hora reales; si un sistema no responde o exige sesión, lo dice tal cual.
- [ ] Puedo dar de alta una aplicación nueva y editarla sin tocar código.
- [ ] Registro un agente con su función y sus herramientas autorizadas y lo encuentro en el chat.
- [ ] Converso con un agente en el chat, cierro el portal, vuelvo y el historial sigue ahí.
- [ ] Creo una carpeta y un documento en Conocimiento; el documento sigue existiendo aunque borre la conversación.
- [ ] Convierto un mensaje del chat en tarea y la veo en Tareas con su responsable y estado.
- [ ] El contador de pendientes del menú coincide con las tareas abiertas.
- [ ] Un usuario de solo lectura puede consultar todo pero no editar ni verificar.
- [ ] En móvil el menú se colapsa y todas las secciones siguen siendo utilizables.
- [ ] Ninguna pantalla muestra un estado de conexión inventado.
