import { getDirectoryHandle } from './db.js';

document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.getElementById('gallery');
    const selectAllBtn = document.getElementById('selectAll');
    const downloadBtn = document.getElementById('downloadSelected');
    const countLabel = document.getElementById('count');
    
    let allImages = [];
    let selectedImages = new Set();
    let dirHandle = null;

    // Check handle access
    async function checkHandle() {
        try {
            dirHandle = await getDirectoryHandle();
            if (!dirHandle) {
                downloadBtn.textContent = "¡Configura carpeta en Popup primero!";
                downloadBtn.disabled = true;
            }
        } catch(e) { console.error(e); }
    }
    checkHandle();

    // 1. Get images from active tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs[0]) return;
        
        chrome.tabs.sendMessage(tabs[0].id, {action: "getAllImages"}, (response) => {
            if (response && response.images) {
                allImages = response.images;
                renderGallery(allImages);
                countLabel.textContent = `Encontradas: ${allImages.length}`;
            } else {
                countLabel.textContent = "No se encontraron imágenes o error de conexión.";
            }
        });
    });

    function renderGallery(images) {
        gallery.innerHTML = '';
        images.forEach((src, index) => {
            const card = document.createElement('div');
            card.className = 'image-card';
            card.dataset.index = index;
            
            card.innerHTML = `
                <img src="${src}" loading="lazy" />
                <div class="check">✓</div>
            `;
            
            card.addEventListener('click', () => toggleSelection(src, card));
            gallery.appendChild(card);
        });
    }

    function toggleSelection(src, card) {
        if (selectedImages.has(src)) {
            selectedImages.delete(src);
            card.classList.remove('selected');
        } else {
            selectedImages.add(src);
            card.classList.add('selected');
        }
        updateToolbar();
    }

    function updateToolbar() {
        if (!dirHandle) {
             downloadBtn.disabled = true;
             return;
        }
        downloadBtn.textContent = `Descargar Seleccionados (${selectedImages.size})`;
        downloadBtn.disabled = selectedImages.size === 0;
    }

    selectAllBtn.addEventListener('click', () => {
        const cards = document.querySelectorAll('.image-card');
        const allSelected = selectedImages.size === allImages.length;
        
        if (allSelected) {
            selectedImages.clear();
            cards.forEach(c => c.classList.remove('selected'));
        } else {
            allImages.forEach(src => selectedImages.add(src));
            cards.forEach(c => c.classList.add('selected'));
        }
        updateToolbar();
    });

    downloadBtn.addEventListener('click', async () => {
        if (!dirHandle) return;
        
        downloadBtn.disabled = true;
        downloadBtn.textContent = "Descargando...";
        
        const imagesToDownload = Array.from(selectedImages);
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < imagesToDownload.length; i++) {
             const url = imagesToDownload[i];
             try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                
                // Improved filename extraction for bulk downloads
                let filename = extractFilenameFromUrl(url, blob.type, i);
                
                const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                successCount++;
             } catch (err) {
                 console.error("Error downloading", url, err);
                 failCount++;
             }
        }
        
        let resultMsg = `¡Terminado! (${successCount}/${imagesToDownload.length})`;
        if (failCount > 0) {
            resultMsg += ` - ${failCount} fallidas`;
        }
        downloadBtn.textContent = resultMsg;
        setTimeout(() => updateToolbar(), 3000);
    });
});

/**
 * Extracts filename from URL for bulk downloads with duplicate prevention
 */
function extractFilenameFromUrl(url, mimeType, index) {
    let filename = `image-${index}`;
    let extension = getExtensionFromMime(mimeType);
    
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const potentialName = pathname.substring(pathname.lastIndexOf('/') + 1);
        
        const decodedName = decodeURIComponent(potentialName);
        
        if (decodedName && decodedName.length > 0 && decodedName.length < 100) {
            const lastDotIndex = decodedName.lastIndexOf('.');
            if (lastDotIndex > 0) {
                filename = decodedName.substring(0, lastDotIndex);
                const urlExt = decodedName.substring(lastDotIndex + 1).toLowerCase();
                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(urlExt)) {
                    extension = urlExt;
                }
            } else {
                filename = decodedName;
            }
        }
        
        if (filename.startsWith('image-')) {
            const nameParam = urlObj.searchParams.get('name') || urlObj.searchParams.get('filename');
            if (nameParam) {
                filename = nameParam.split('.')[0];
                const ext = nameParam.split('.').pop();
                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext.toLowerCase())) {
                    extension = ext.toLowerCase();
                }
            }
        }
    } catch(e) {
        console.warn("Could not parse URL for filename", e);
    }
    
    filename = filename.replace(/[<>:"/\\|?*]/g, '_').trim();
    if (filename.length === 0) filename = `image-${index}`;
    
    return `${filename}.${extension}`;
}

/**
 * Gets file extension from MIME type
 */
function getExtensionFromMime(mimeType) {
    const mimeToExt = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/bmp': 'bmp',
        'image/x-icon': 'ico',
        'image/tiff': 'tiff'
    };
    return mimeToExt[mimeType] || 'jpg';
}
