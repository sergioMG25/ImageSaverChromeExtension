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
        
        for (let i = 0; i < imagesToDownload.length; i++) {
             const url = imagesToDownload[i];
             try {
                const res = await fetch(url);
                const blob = await res.blob();
                
                let filename = `bulk-${Date.now()}-${i}.jpg`;
                // try extract name...
                
                const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                successCount++;
             } catch (err) {
                 console.error("Error downloading", url, err);
             }
        }
        
        downloadBtn.textContent = `¡Terminado! (${successCount}/${imagesToDownload.length})`;
        setTimeout(() => updateToolbar(), 3000);
    });
});
