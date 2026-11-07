# Conocimiento y diagramas

## Resultado

La Biblioteca Central deja de guardar solo texto y archivos: también guarda **diagramas editables** —flujos, mapas mentales, organigramas y secuencias— con las mismas reglas que un documento: mundo, carpeta, etiquetas, versiones, permisos, bitácora y búsqueda.

El documento maestro ya trae dos diagramas escritos en **Mermaid** (arquitectura general y núcleo). Se usarán como primeros ejemplos reales, no como maqueta.

## Cómo se usa

1. **Conocimiento → Nuevo diagrama** (junto a “Nuevo documento”).
2. Se abre un editor de dos paneles: a la izquierda el texto del diagrama, a la derecha el dibujo que se actualiza al escribir.
3. Plantillas de partida: flujo, mapa mental, organigrama, secuencia.
4. **Guardar** lo deja en la carpeta y el mundo elegidos, con etiquetas.
5. Al abrirlo después: se ve el dibujo, con opciones **Editar**, **Copiar código**, **Descargar SVG** e **Historial**.

## Dónde vive y qué respeta

- Es un elemento más de la biblioteca: no hay otra biblioteca ni otra tabla de permisos.
- **Versiones**: cada edición guarda la anterior y se puede restaurar.
- **Permisos**: acceso al mundo o restringido, y autorizaciones a agentes o proyectos, igual que un documento.
- **Bitácora**: alta, consulta, edición, autorización y revocación.
- **Búsqueda**: el texto del diagrama entra en el índice; buscar “línea compartida” encontrará el diagrama aunque su título sea “Arquitectura general”.
- **Separación de mundos**: un diagrama de Santo Tomás no aparece en Financia Sonora ni lo recibe Atlas sin autorización.

## Qué puede hacer Atlas

- Leer el **código** del diagrama y explicarlo o proponer cambios.
- Generar diagramas nuevos a partir de una conversación.
- **No** “ve” la imagen renderizada: trabaja con el texto. Se dirá así en la interfaz para no prometer lo que no hace.

## Límites y exclusiones

- Es dibujo **por texto**, no un lienzo para arrastrar cajas. El lienzo queda para una fase posterior, reutilizando el mismo tipo de elemento.
- Diagramas muy grandes pueden requerir ajustes de sintaxis; si hay un error, se muestra el mensaje y no se rompe la pantalla.
- No se incrustan diagramas dentro de documentos en esta entrega; se enlazan desde el documento.
- Descarga en SVG y copia del código. PNG queda para después.
- No hay edición simultánea de dos personas.

## Entregable observable

- [ ] “Nuevo diagrama” aparece en Conocimiento y crea un elemento del tipo diagrama.
- [ ] Al escribir el código, el dibujo se actualiza sin recargar.
- [ ] Guardar conserva mundo, carpeta y etiquetas; al reabrir, el dibujo se ve.
- [ ] Editar varias veces deja versiones restaurables.
- [ ] Un diagrama restringido no lo ve un colaborador; autorizado, sí; revocado, deja de verlo.
- [ ] La búsqueda por una palabra del contenido encuentra el diagrama.
- [ ] Los dos diagramas del documento maestro existen como ejemplos en el Núcleo Central.
- [ ] Se puede copiar el código y descargar el SVG.
- [ ] Atlas recibe el código del diagrama cuando está autorizado, y la interfaz aclara que no ve la imagen.
- [ ] Un diagrama con sintaxis inválida muestra el error y no rompe la pantalla.
