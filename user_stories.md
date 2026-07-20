# Historias de Usuario - Image Saver Pro (v1.3)

## HU01 - Captura de Pantalla Completa
**Como** usuario de la extensión,
**Quiero** capturar la pantalla completa de la pestaña actual mediante el botón "Capturar Pantalla" en el popup o usando el atajo de teclado `Alt+Shift+C`,
**Para** guardar una copia visual de la información que estoy consultando.

**Criterios de Aceptación:**
- El popup muestra un botón "Capturar Pantalla".
- El atajo de teclado `Alt+Shift+C` dispara la captura.
- La captura se guarda mediante el offscreen document en la carpeta configurada.
- Se muestra una notificación de éxito o error tras guardar.

## HU02 - Selección de Carpeta Nativa (File System Access)
**Como** usuario avanzado,
**Quiero** seleccionar cualquier carpeta del sistema a través del selector nativo, y que la extensión recuerde el acceso entre sesiones,
**Para** almacenar mis capturas donde yo quiera sin estar limitado a "Descargas".

**Criterios de Aceptación:**
- El popup incluye un botón "Seleccionar Carpeta..." que abre el selector nativo (`showDirectoryPicker`).
- La carpeta elegida se guarda en IndexedDB (`saveDirectoryHandle`).
- Al abrir el popup se valida que el permiso de la carpeta sigue activo; si ha expirado se muestra un mensaje de error y se invita a volver a seleccionar.
- La UI muestra `✓ Usando: <nombre>` cuando la carpeta está disponible.

## HU03 - Descarga vía Menú Contextual
**Como** usuario navegando por la web,
**Quiero** hacer clic derecho sobre una imagen y elegir "Guardar imagen en carpeta configurada",
**Para** descargar imágenes específicas rápidamente.

**Criterios de Aceptación:**
- Se crea una entrada `contextMenus` con id `save-image-to-folder` para `contexts: ['image']`.
- Al seleccionar la opción, la extensión descarga la imagen usando `fetch`, la convierte a Blob y la guarda mediante offscreen.
- Se respeta la carpeta configurada y se muestra notificación de éxito/error.

## HU04 - Botón Flotante Inteligente bajo el Cursor
**Como** usuario de redes sociales (Instagram/Facebook),
**Quiero** que al pasar el cursor sobre una imagen aparezca un botón flotante para guardarla,
**Para** descargar imágenes protegidas por capas transparentes.

**Criterios de Aceptación:**
- El comando `save-under-cursor` (atajo `Alt+Shift+S`) envía un mensaje al content script solicitando la imagen bajo el cursor (`getHoveredImage`).
- El content script devuelve la URL de la imagen y la extensión la guarda usando la lógica de descarga.

## HU05 - Descarga Masiva (Bulk)
**Como** usuario que investiga o colecciona imágenes,
**Quiero** abrir una interfaz que muestre todas las imágenes de la página y poder descargarlas en lote,
**Para** ahorrar tiempo.

**Criterios de Aceptación:**
- El popup contiene un botón "Masiva" que abre `bulk.html` en una nueva pestaña.
- `bulk.html` y `bulk.js` implementan una galería de imágenes detectadas, selección múltiple y descarga masiva a la carpeta configurada.
- Se preservan los nombres y formatos originales de los archivos.
- Se muestra un conteo de éxitos/fallos.

## HU06 - Manejo de Formatos de Imagen
**Como** usuario que trabaja con diversos tipos de imágenes,
**Quiero** que las imágenes se guarden en su formato original (PNG, JPG, GIF, WebP, SVG, BMP, ICO, TIFF),
**Para** mantener la calidad y compatibilidad.

**Criterios de Aceptación:**
- `extractFilenameFromUrl` determina la extensión a partir del MIME de la respuesta o de la URL.
- `getExtensionFromMime` mapea los MIME a extensiones correctas.
- Los nombres de archivo son sanitizados (caracteres ilegales reemplazados por `_`).

## HU07 - Validación y Recuperación de Permisos
**Como** usuario,
**Quiero** ser notificado si los permisos de la carpeta han expirado y poder restaurarlos rápidamente,
**Para** continuar usando la extensión sin errores.

**Criterios de Aceptación:**
- Al iniciar el popup se verifica `handle.queryPermission({mode:'readwrite'})`.
- Si el permiso está perdido, se muestra un mensaje de error y se cambia el botón de selección para indicar la necesidad de re‑seleccionar.
- La notificación de error incluye un botón que, al hacer clic, abre `popup.html` para que el usuario vuelva a otorgar permisos.

## HU08 - Notificaciones de Estado
**Como** usuario,
**Quiero** recibir notificaciones claras de éxito, error o progreso de las operaciones,
**Para** saber el resultado de cada acción.

**Criterios de Aceptación:**
- Función `notify(title, message, isError)` muestra notificaciones Chrome.
- Los estados se reflejan también en el elemento `#status` del popup con estilos `success` o `error`.

---
*Todas las historias están alineadas con la lógica actual de `background.js`, `popup.js`, `content.js` y los archivos de UI.*
