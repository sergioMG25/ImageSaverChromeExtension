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
            
            let filename = 'image.png';
            try {
                const urlPath = new URL(imageUrl).pathname;
                const potentialName = urlPath.substring(urlPath.lastIndexOf('/') + 1);
                if (potentialName && potentialName.length < 100) filename = potentialName;
            } catch(e) {}
            
            filename = filename.replace(/[<>:"/\\|?*]/g, '_');
            if (!filename.includes('.')) filename += '.jpg';

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
