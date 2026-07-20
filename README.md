# Image Saver Pro Chrome Extension

## Descripción

Una extensión para Chrome que permite capturar pantallas completas, guardar imágenes individuales y realizar descargas masivas, todo directamente en una carpeta elegida por el usuario mediante la API **File System Access**. Incluye manejo de permisos, notificaciones y soporte para varios formatos de imagen.

## Características

- **Captura de pantalla completa** (botón en el popup o atajo `Alt+Shift+C`).
- **Selección de carpeta** nativa y persistente entre sesiones.
- **Descarga vía menú contextual** para imágenes.
- **Botón flotante** bajo el cursor (`Alt+Shift+S`).
- **Descarga masiva** de todas las imágenes de una página.
- **Preservación de formatos originales** (PNG, JPG, GIF, WebP, SVG, BMP, ICO, TIFF).
- **Validación y recuperación de permisos** de la carpeta seleccionada.
- **Notificaciones** de éxito/error y barra de estado en el popup.

## Instalación (modo desarrollador)

1. Clona o descarga el repositorio.
2. Abre Chrome y navega a `chrome://extensions`.
3. Activa **Modo de desarrollador** (arriba a la derecha).
4. Pulsa **Cargar descomprimida** y selecciona la carpeta raíz del proyecto (`ImageSaverChromeExtension`).
5. La extensión aparecerá en la barra de extensiones.

## Uso rápido

- **Seleccionar carpeta**: Haz clic en *Seleccionar Carpeta…* en el popup y elige la ubicación donde se guardarán las imágenes.
- **Capturar pantalla**: Pulsa el botón *Capturar Pantalla* o usa `Alt+Shift+C`.
- **Guardar imagen bajo el cursor**: Sitúa el cursor sobre una imagen y pulsa `Alt+Shift+S`.
- **Descarga masiva**: Haz clic en *Masiva* en el popup para abrir la interfaz de descarga múltiple.
- **Menú contextual**: Haz clic derecho sobre cualquier imagen → *Guardar imagen en carpeta configurada*.

## Desarrollo

- `manifest.json` define permisos, scripts y comandos.
- `background.js` maneja captura, descarga y comunicación con el offscreen document.
- `popup.js/html/css` conforman la UI.
- `offscreen.html` permite escribir archivos usando la API de archivos.
- `db.js` almacena y recupera el `DirectoryHandle` en IndexedDB.
- `bulk.html/js` implementa la galería de descarga masiva.

## Contribuir

1. Forkea el repositorio.
2. Crea una rama para tu cambio (`git checkout -b feature/...`).
3. Realiza los cambios y ejecuta pruebas manuales.
4. Haz commit y abre un Pull Request.

---
*Todas las historias de usuario están alineadas con la lógica actual del proyecto (ver `user_stories.md`).*
