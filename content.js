// Image Saver Pro - Content Script

let currentButton = null;
let currentImg = null;

// Crear el elemento del botón una sola vez
function createButton() {
  const btn = document.createElement('div');
  btn.className = 'image-saver-btn';
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  `;
  
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentImg && currentImg.src) {
        animateButton(btn);
        chrome.runtime.sendMessage({
            action: 'downloadImage',
            url: currentImg.src
        });
    }
  });

  // Evitar que el botón desaparezca si el mouse está sobre él
  btn.addEventListener('mouseenter', () => {
      // Mantener visible
  });

  document.body.appendChild(btn);
  return btn;
}

function animateButton(btn) {
    const originalHTML = btn.innerHTML;
    btn.style.backgroundColor = '#4ade80'; // Green
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    
    setTimeout(() => {
        btn.style.backgroundColor = '';
        btn.innerHTML = originalHTML;
        // Ocultar después de descargar para feedback visual
        hideButton();
    }, 1500);
}

function updateButtonPosition(img, btn) {
  const rect = img.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  // Verificar si la imagen es visible y tiene tamaño suficiente
  if (rect.width < 100 || rect.height < 100) {
      hideButton();
      return;
  }

  // Posicionar en inferior izquierda
  // left: rect.left + scrollLeft + margin
  // top: rect.bottom + scrollTop - btnHeight - margin
  
  const margin = 10;
  const btnSize = 40;
  
  btn.style.left = `${rect.left + scrollLeft + margin}px`;
  btn.style.top = `${rect.bottom + scrollTop - btnSize - margin}px`;
  btn.style.display = 'flex';
  btn.classList.add('show');
}

function hideButton() {
    if (currentButton) {
        currentButton.style.display = 'none';
        currentButton.classList.remove('show');
    }
    currentImg = null;
}

// Inicialización
currentButton = createButton();
hideButton();

// Event Delegation para detectar hover en imágenes
document.addEventListener('mouseover', (e) => {
    // Si entramos al botón, no hacer nada
    if (e.target === currentButton || currentButton.contains(e.target)) return;

    let targetImg = null;

    // 1. Verificación directa (caso simple)
    if (e.target.tagName === 'IMG') {
        targetImg = e.target;
    } else {
        // 2. Detección profunda (caso Instagram/Facebook con overlays)
        // Buscamos elementos bajo el cursor
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        for (const el of elements) {
            // Caso A: Es una etiqueta IMG
            if (el.tagName === 'IMG') {
                targetImg = el;
                break;
            }
            // Caso B: Elementos con background-image (opcional, pero común en algunos diseños)
            const style = window.getComputedStyle(el);
            if (style.backgroundImage && style.backgroundImage !== 'none' && style.backgroundImage.startsWith('url(')) {
                // Extraer URL si es necesario, pero para este botón de descarga, mejor centrarse en IMGs reales primero
                // Para simplificar, nos enfocamos en IMG tags ocultos por divs
            }
        }
    }

    if (targetImg) {
        // Validar tamaño para no mostrar en iconos pequeños
        const rect = targetImg.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) {
            currentImg = targetImg;
            updateButtonPosition(targetImg, currentButton);
            return;
        }
    }

    // Si llegamos aquí, no encontramos imagen o era muy pequeña.
    // Solo ocultamos si NO estamos sobre el botón ni sobre la imagen actual
    setTimeout(() => {
        if (!currentButton.matches(':hover')) {
             // Chequeo adicional: ¿Sigue el mouse sobre la imagen 'currentImg'?
             // Con overlays es difícil saberlo con :hover simple.
             // Usamos elementsFromPoint de nuevo para ver si la imagen sigue bajo el cursor?
             // Simplificación: Dejamos el botón un momento, si el usuario mueve el mouse fuera, desaparecerá en el próximo evento de mouseover válido a 'nada'.
             
             // Mejor estrategia de ocultamiento:
             // Si el nuevo target NO es una imagen ni el botón y está lejos... 
             // Por simplicidad del MVP: Ocultar.
             // Pero para evitar parpadeo en overlays, necesitamos ser cuidadosos.
             
             // Si no detectamos imagen en este evento, ocultamos.
             hideButton();
        }
    }, 100);
});

// Listener para scroll para re-posicionar o ocultar
window.addEventListener('scroll', () => {
    if (currentImg && currentButton.style.display !== 'none') {
        updateButtonPosition(currentImg, currentButton);
    }
}, { passive: true });

// Listener para recibir comandos del background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getHoveredImage") {
        if (currentImg && currentImg.src) {
            chrome.runtime.sendMessage({
                action: 'downloadImage',
                url: currentImg.src
            });
            
            // Visual feedback
            const btn = currentButton || createButton();
            updateButtonPosition(currentImg, btn);
            animateButton(btn);
        }
    } else if (request.action === "getAllImages") {
        const images = Array.from(document.images)
            .filter(img => img.src && img.width > 50 && img.height > 50) // Basic filtering
            .map(img => img.src);
        
        // Remove duplicates
        const uniqueImages = [...new Set(images)];
        sendResponse({images: uniqueImages});
    }
});
