import { getDirectoryHandle } from './db.js';

// Setup Offscreen
let creatingOffscreen; // Global promise to prevent race conditions during creation

async function setupOffscreenDocument(path) {
  // Check if already exists (using full URL for precision)
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // If creation is already in progress, wait for it
  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  // Create document
  if (chrome.offscreen) {
      creatingOffscreen = chrome.offscreen.createDocument({
        url: path,
        reasons: ['BLOBS'], 
        justification: 'To write files using File System Access API in background',
      });
      
      try {
          await creatingOffscreen;
      } catch (err) {
          if (!err.message.includes('Only a single offscreen')) {
              throw err;
          }
      } finally {
          creatingOffscreen = null;
      }
  } else {
      console.warn("Offscreen API not available");
  }
}

async function terminateOffscreenDocument() {
    // Optional: Keep it alive or kill it to save resources. 
    // For this app, keeping it alive might be better for responsiveness.
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-image-to-folder",
    title: "Guardar imagen en carpeta configurada",
    contexts: ["image"]
  });
});

function notify(title, message, isError = false) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message,
        priority: 2
    });
}

async function saveViaOffscreen(dataUrl, filename) {
    await setupOffscreenDocument('offscreen.html');
    
    // Send message
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'saveFileOffscreen',
            blob: dataUrl, // Pass Data URL directly
            filename: filename
        }, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else if (response && response.success) {
                resolve();
            } else {
                reject(new Error(response?.error || "Unknown offscreen error"));
            }
        });
    });
}

async function downloadImage(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        
        // Convert Blob to Data URL to pass to offscreen
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64data = reader.result;
            
            // Improved filename extraction
            let filename = extractFilenameFromUrl(imageUrl, blob.type);
            
            try {
                await saveViaOffscreen(base64data, filename);
                notify("Guardado Exitoso", `Imagen guardada: ${filename}`);
            } catch(err) {
                 console.error("Save error", err);
                 if (err.message && err.message.includes("PERMISSION_REQUIRED")) {
                     notify("Acceso Perdido", "Haz CLIC AQUÍ para restaurar el acceso a la carpeta.", true);
                 } else {
                     notify("Error al Guardar", err.message, true);
                 }
            }
        };
    } catch (err) {
        console.error("Download failed", err);
        notify("Error al Descargar", err.message, true);
    }
}

/**
 * Extracts a clean filename from URL or generates one based on content type
 */
function extractFilenameFromUrl(url, mimeType) {
    let filename = 'image';
    let extension = getExtensionFromMime(mimeType);
    
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const potentialName = pathname.substring(pathname.lastIndexOf('/') + 1);
        
        // Decode URL-encoded characters
        const decodedName = decodeURIComponent(potentialName);
        
        if (decodedName && decodedName.length > 0 && decodedName.length < 100) {
            // Check if it has an extension
            const lastDotIndex = decodedName.lastIndexOf('.');
            if (lastDotIndex > 0) {
                filename = decodedName.substring(0, lastDotIndex);
                const urlExt = decodedName.substring(lastDotIndex + 1).toLowerCase();
                // Use URL extension if valid, otherwise use mime-based extension
                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(urlExt)) {
                    extension = urlExt;
                }
            } else {
                filename = decodedName;
            }
        }
        
        // Check for query parameters that might contain filename (e.g., ?name=image.png)
        if (filename === 'image') {
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
    
    // Sanitize filename
    filename = filename.replace(/[<>:"/\\|?*]/g, '_').trim();
    if (filename.length === 0) filename = 'image';
    
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

// Handle notification click to restore permission
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId) {
        // Open popup or options to restore permission
        // We cannot programmatically open the popup action, but we can open an options page inside a tab
        // Or just open the popup.html in a tab, which acts as a full page perm requestor.
        chrome.tabs.create({ url: 'popup.html' });
    }
});

async function captureAndDownload() {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
        if (chrome.runtime.lastError) {
             notify("Error de Captura", chrome.runtime.lastError.message, true);
             return;
        }
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `screenshot-${timestamp}.png`;
            
            await saveViaOffscreen(dataUrl, filename);
            notify("Captura Guardada", filename);
        } catch (err) {
            console.error("Capture save failed", err);
            notify("Error al Guardar Captura", err.message, true);
        }
    });
}

// Listeners
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "save-image-to-folder") {
      downloadImage(info.srcUrl);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "downloadImage") {
        downloadImage(request.url);
    } else if (request.action === "captureVisibleTab") {
        captureAndDownload();
        sendResponse({status: "started"});
    }
    return true; 
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "capture-screen") {
        captureAndDownload();
    } else if (command === "save-under-cursor") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, {action: "getHoveredImage"});
        });
    }
});
