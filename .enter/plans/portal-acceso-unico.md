# Portal de Acceso Único — Financia Sonora

## 1. Punto de partida

El proyecto aquí está vacío: es la plantilla de arranque (una pantalla de bienvenida genérica y componentes visuales). No hay portal, ni datos, ni inicio de sesión. Se construye todo desde cero, sin arrastrar restos de nada.

La imagen que enviaste es la referencia real del portal que quieres: tema oscuro, barra azul superior, secciones por categoría (Núcleos Centrales, Aplicaciones de crédito y gestión, Portal web y soporte) y tarjetas con plataforma, cuenta, descripción, estado y botones "Abrir" / "Abrir editor". Ese diseño es la base visual que voy a replicar, con el inventario de aplicaciones que aparece ahí ya cargado.

**Núcleos revisados en vivo:**

| Núcleo | Resultado real |
|---|---|
| Centro de Control — Hércules | Público y activo. Ya muestra directorio de aplicaciones, agentes, operaciones e integraciones. |
| Núcleo Central Operativo — Base44 | Responde, pero exige iniciar sesión (Google/correo). |
| NEXO CENTRAL — Hércules | Responde, pero es preview privado: solo miembros de la organización. |

Esos núcleos no se reconstruyen: se enlazan y se supervisan desde el portal.

## 2. Las tres piezas centrales

### A. Página central de control
Es la pantalla principal y la que replica tu referencia. Reúne **todas** las apps y webs en un solo lugar, aunque vivan en plataformas y cuentas distintas.

- Tarjetas agrupadas por categoría, con: nombre, plataforma (Base44, Hércules, Google, agentes IA, otra), cuenta propietaria, función, estado (activa / por verificar / pendiente / sin publicar), última verificación y URL.
- Botones "Abrir", "Abrir editor" (solo si la app tiene constructor), "Copiar URL" y "Editar ficha".
- Encabezado con contadores: total de aplicaciones, activas, por verificar y pendientes, más la fecha de última revisión.
- Alta, edición y archivo de cualquier aplicación desde el propio portal, sin tocar código: nombre, plataforma, cuenta, función, URL pública, URL de constructor, estado y notas.
- Búsqueda y filtros por plataforma, por cuenta/usuario y por estado.
- **Verificación honesta:** al pulsar "Verificar" el portal consulta el sistema desde el servidor y anota la hora. El resultado es "alcanzable", "requiere inicio de sesión" o "no disponible". Nunca muestra una conexión inventada.

### B. Base de conocimiento tipo Drive
Una pestaña con administrador de archivos real, no una lista plana:

- Árbol de carpetas y subcarpetas a la izquierda, con crear, renombrar, mover y eliminar.
- Vista de contenido con migas de pan (ruta), vista de cuadrícula o lista y orden por nombre o fecha.
- Subida de archivos (PDF, imágenes, hojas de cálculo, documentos) que quedan guardados en el almacenamiento del portal y se pueden abrir, descargar o borrar.
- Documentos propios creados dentro del portal con editor de texto enriquecido (títulos, listas, tablas, vínculos), autor y fecha de actualización.
- Búsqueda por nombre y etiquetas en todo el conocimiento.
- Todo persiste independientemente de las conversaciones: borrar un chat no borra nada del conocimiento.

### C. Matriz de IA — dialogar con varias IA a la vez
Una pestaña en formato de matriz: **una columna por agente**.

- Columnas para ChatGPT, Claude y los agentes que se registren, cada una con su nombre, proveedor y función.
- Una barra de mensaje compartida que envía la misma pregunta a todas las columnas y recibe las respuestas en paralelo, para comparar criterios en el mismo instante.
- Cada columna permite además conversar solo con ese agente, y se puede activar o desactivar qué agentes participan.
- Conversaciones guardadas y recuperables; desde cualquier respuesta se puede "Guardar en Conocimiento" o "Crear tarea".
- Si un agente falla o no responde, su columna lo indica y se puede reintentar; no se simulan respuestas.

## 3. Módulos de apoyo

- **Núcleos:** ficha de cada núcleo con su función, enlaces, estado verificado y notas de acceso (por ejemplo, que NEXO solo admite miembros de la organización).
- **Agentes IA:** registro con nombre, proveedor, función, responsabilidades, herramientas autorizadas y si accede al conocimiento compartido. Los agentes registrados aparecen en la matriz.
- **Chat central:** bandeja de conversaciones con historial, búsqueda y vínculo a tareas y conocimiento.
- **Tareas:** título, responsable, prioridad, estado, fecha y vínculo a una app, agente o flujo, con contador de pendientes en el menú.
- **Flujos de trabajo:** procesos con pasos ordenados (quién hace qué, en qué orden, con qué app o agente) y vista de diagrama generada de esos pasos.
- **Integraciones:** inventario de conexiones con tipo, estado, responsable y última verificación.
- **Cuentas y usuarios:** correos y cuentas por plataforma, con función, permisos y apps asociadas; y los usuarios del portal con su nivel de permiso.
- **Configuración:** datos del portal, preferencias de tema, usuarios y registro de verificaciones.
- **Acceso:** inicio de sesión propio con correo y contraseña, sesión persistente, y tres niveles (administrador, colaborador, solo lectura).

## 4. Inventario que se precarga

Tomado de tu imagen; todo queda editable y con lo dudoso marcado como "por verificar", no inventado.

- **Núcleos:** Centro de Control (Hércules) · Núcleo Central Operativo (Base44) · Núcleo Central OP (Cappy, sin publicar)
- **Crédito y gestión:** FinanciaPro Sonora (Base44 / creditosenlinea5) · PrestaCore (Base44 / Capps) · Financia Sonora CORE (Base44) · Financia Sonora — Gestión de préstamos (Hércules) · Credit Management System (Hércules)
- **Portal web y soporte:** Portal público Financia Sonora (Base44) · ChatMaster CRM (Base44) · MandaderoPro (Base44) · Drive FINANCIA SONORA (Google) · Supagente (agente IA)

Los correos de cuenta, URLs de constructor y estados que no aparecen confirmados en la imagen quedan vacíos y señalados como pendientes, para que los completes desde la ficha de cada app.

## 5. Diseño

Se sigue tu referencia: fondo azul muy oscuro, barra superior con el nombre Financia Sonora y "Portal de Acceso Único", títulos de sección en azul con contador, tarjetas oscuras de borde fino, distintivos de plataforma por color (Hércules azul, Base44 violeta, Google verde, agentes ámbar), botones verdes para abrir y azules para editar. Tipografía limpia, densidad de consola, totalmente responsive: en móvil el menú se colapsa y las tarjetas pasan a una columna.

## 6. Límites que se respetan

- No se guardan contraseñas de terceros; solo correos y notas. Cada plataforma externa pide su propio inicio de sesión.
- La verificación confirma alcance, no contenido privado.
- No se promete inicio de sesión único hacia Base44, Hércules o Google: no lo permiten desde aquí.
- Los núcleos siguen siendo sistemas independientes; no se fusionan ni se migran.
- La matriz usa los modelos disponibles en el proyecto y los agentes registrados; no se conecta a tu cuenta personal de ChatGPT o Claude sin una clave autorizada.

## 7. Fuera de esta entrega

- Lienzo libre de flujos con nodos arrastrables y conexiones dibujadas.
- Diagramas y mapas conceptuales dentro de Conocimiento.
- Sincronización bidireccional por API con Base44, Hércules o Google Drive (requiere credenciales y permisos que esas plataformas deben conceder).
- Inicio de sesión único con Google hacia el portal.

## 8. Resultado observable

- [ ] Abro el portal y veo la página central con las cinco/trece aplicaciones de la referencia agrupadas por categoría y sus distintivos de plataforma.
- [ ] Filtro por plataforma, por cuenta y por estado, y encuentro la app que busco.
- [ ] "Abrir" y "Abrir editor" llevan a la URL correcta en pestaña nueva; "Verificar" devuelve estado y hora reales.
- [ ] Doy de alta una app nueva con su cuenta y su URL de constructor, sin tocar código.
- [ ] En Conocimiento creo una carpeta, una subcarpeta, subo un archivo y creo un documento; todo sigue ahí tras recargar.
- [ ] En la matriz envío una pregunta y recibo respuesta de varias IA al mismo tiempo, cada una en su columna.
- [ ] Guardo una respuesta de la matriz en Conocimiento y la encuentro en su carpeta.
- [ ] Cierro sesión, vuelvo a entrar y mi historial, mis tareas y mis carpetas siguen intactos.
- [ ] Un usuario de solo lectura consulta todo pero no edita ni verifica.
- [ ] En móvil el menú se colapsa y las tres piezas principales siguen siendo utilizables.
- [ ] Ninguna pantalla muestra un estado de conexión inventado.
