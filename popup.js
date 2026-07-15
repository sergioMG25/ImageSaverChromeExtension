import { saveDirectoryHandle, getDirectoryHandle } from './db.js';

document.addEventListener("DOMContentLoaded", async () => {
  const selectFolderBtn = document.getElementById("selectFolderBtn");
  const folderNameDisplay = document.getElementById("folderNameDisplay");
  const currentFolderLabel = document.getElementById("currentFolderLabel");
  
  const captureBtn = document.getElementById("captureBtn");
  const bulkBtn = document.getElementById('bulkBtn');
  const historyBtn = document.getElementById('historyBtn');
  const statusDiv = document.getElementById("status");

  // Listeners
  if (bulkBtn) bulkBtn.addEventListener('click', () => chrome.tabs.create({ url: 'bulk.html' }));
  if (historyBtn) historyBtn.addEventListener('click', () => chrome.tabs.create({ url: 'chrome://downloads' }));

  // Initialize Folder State and validate permissions
  await initializeFolderState();

  // Handle Folder Selection
  selectFolderBtn.addEventListener('click', async () => {
      try {
          const handle = await window.showDirectoryPicker();
          await saveDirectoryHandle(handle);
          updateFolderUI(handle.name);
          showStatus("Carpeta actualizada correctamente", "success");
      } catch (err) {
          if (err.name !== 'AbortError') {
              showStatus("Error al seleccionar carpeta: " + err.message, "error");
          }
      }
  });

  // Capture Button Logic
  captureBtn.addEventListener('click', () => {
    setLoading(true);
    
    // We trigger the capture in background
    chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, (response) => {
        setLoading(false);
        if (chrome.runtime.lastError) {
             showStatus("Error: " + chrome.runtime.lastError.message, "error");
        } else {
             showStatus("Procesando captura...", "success");
             setTimeout(() => showStatus("", ""), 3000);
        }
    });
  });

  // Listen for completion messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'downloadComplete') {
          setLoading(false);
          if (message.success) {
              showStatus(`¡${message.filename} guardado!`, "success");
          } else {
              showStatus("Error: " + message.error, "error");
          }
          setTimeout(() => showStatus("", ""), 3000);
      }
  });

  async function initializeFolderState() {
      try {
          const handle = await getDirectoryHandle();
          if (handle) {
              // Verify permission is still valid
              const permission = await handle.queryPermission({ mode: 'readwrite' });
              if (permission === 'granted') {
                  updateFolderUI(handle.name);
              } else {
                  // Permission lost, prompt user to re-select
                  showStatus("Permisos de carpeta expirados. Selecciona una nueva carpeta.", "error");
                  selectFolderBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> Seleccionar Carpeta`;
              }
          } else {
              showStatus("Selecciona una carpeta para guardar", "error");
          }
      } catch (e) {
          console.error("Error loading handle", e);
          showStatus("Error cargando configuración", "error");
      }
  }

  function updateFolderUI(name) {
      folderNameDisplay.textContent = name;
      currentFolderLabel.style.display = 'block';
      selectFolderBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> Cambiar Carpeta`;
      showStatus("", "");
  }

  function showStatus(text, type) {
    statusDiv.textContent = text;
    statusDiv.className = 'status ' + type;
  }

  function setLoading(isLoading) {
    captureBtn.disabled = isLoading;
    if (isLoading) {
      captureBtn.innerHTML = 'Guardando...';
    } else {
      captureBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
        Capturar Pantalla
      `;
    }
  }
});
