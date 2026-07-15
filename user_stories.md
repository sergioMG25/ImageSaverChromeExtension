# Historias de Usuario - Image Saver Pro (v1.3)

## HU01 - Captura de Pantalla Completa

**Como** usuario de la extensión,
**Quiero** capturar una imagen de la pestaña visible actual mediante un botón en el popup o atajo de teclado,
**Para** guardar una copia visual de la información que estoy consultando.

**Criterios de Aceptación:**

- El popup debe mostrar un botón "Capturar Pantalla".
- Atajo de teclado: `Alt + Shift + C`.
- La imagen debe guardarse en la carpeta seleccionada por el usuario.
- Feedback visual durante el proceso de captura.

## HU02 - Selección de Carpeta Nativa (File System Access)

**Como** usuario avanzado,
**Quiero** seleccionar cualquier carpeta de mi sistema operativo a través del explorador de archivos nativo,
**Para** almacenar mis capturas donde yo quiera, sin estar restringido a la carpeta "Descargas".

**Criterios de Aceptación:**

- El popup debe tener un botón "Seleccionar Carpeta..." que abra el diálogo nativo del SO.
- La extensión debe recordar el acceso a la carpeta entre sesiones (persistencia en IndexedDB).
- Chrome debe solicitar confirmación de permisos de escritura solo cuando sea necesario.
- Si no hay carpeta seleccionada, se debe informar al usuario antes de intentar descargar.
- **MEJORA v1.3**: Validación proactiva de permisos al iniciar, detectando permisos expirados.

## HU03 - Descarga vía Menú Contextual

**Como** usuario navegando por la web,
**Quiero** hacer clic derecho en una imagen y tener una opción para descargarla,
**Para** guardar imágenes específicas rápidamente.

**Criterios de Aceptación:**

- Opción "Guardar imagen en carpeta configurada" en menú contextual.
- Descarga directa a la carpeta seleccionada en HU02.
- **MEJORA v1.3**: Extracción inteligente de nombres de archivo desde URL y preservación del formato original (PNG, WebP, GIF, etc.).

## HU04 - Botón Flotante Inteligente

**Como** usuario de redes sociales (Instagram/Facebook),
**Quiero** ver un botón de descarga superpuesto al pasar el mouse sobre una imagen,
**Para** descargar imágenes difícilmente accesibles o protegidas por capas transparentes.

**Criterios de Aceptación:**

- Botón visible en esquina inferior izquierda al hacer hover.
- Detección avanzada a través de capas transparentes (`elementsFromPoint`).
- Atajo de teclado: `Alt + Shift + S` para guardar la imagen bajo el cursor.

## HU05 - Descarga Masiva (Bulk)

**Como** usuario que investiga o colecciona imágenes,
**Quiero** ver y descargar todas las imágenes de una página web a la vez,
**Para** ahorrar tiempo evitando descargar una por una.

**Criterios de Aceptación:**

- Botón "Masiva" en el popup que abre una nueva interfaz.
- Galería con todas las imágenes detectadas en la pestaña activa.
- Capacidad de seleccionar múltiples o todas las imágenes.
- Botón para descargar la selección directamente a la carpeta configurada.
- **MEJORA v1.3**: 
  - Detección mejorada de imágenes lazy load (data-src, data-lazy-src, etc.)
  - Extracción de nombres originales de archivos
  - Conteo de éxitos/fallos en descargas masivas
  - Preservación de formatos originales

## HU06 - Manejo de Formatos de Imagen (NUEVO v1.3)

**Como** usuario que trabaja con diversos tipos de imágenes,
**Quiero** que las imágenes se guarden en su formato original,
**Para** mantener la calidad y compatibilidad adecuadas.

**Criterios de Aceptación:**

- Detección automática del tipo MIME de la imagen
- Asignación correcta de extensiones (png, jpg, gif, webp, svg, bmp, ico, tiff)
- Nombres de archivo sanitizados sin caracteres inválidos

## HU07 - Validación de Permisos (NUEVO v1.3)

**Como** usuario,
**Quiero** ser notificado si los permisos de carpeta han expirado,
**Para** poder restaurarlos y continuar usando la extensión sin errores.

**Criterios de Aceptación:**

- Verificación de permisos al abrir el popup
- Mensaje claro indicando pérdida de permisos
- Botón para re-seleccionar carpeta fácilmente
