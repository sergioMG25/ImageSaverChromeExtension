import { getDirectoryHandle } from './db.js';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'saveFileOffscreen') {
        handleSaveFile(msg.blob, msg.filename)
            .then(() => sendResponse({success: true}))
            .catch((err) => sendResponse({success: false, error: err.message}));
        return true; 
    }
});

async function handleSaveFile(serializedBlob, filename) {
    // Decode Blob? Messages pass JSON-serializable data usually.
    // Blobs defined in background can be passed to offscreen?
    // Chrome Extension messaging supports passing objects but Blobs might be tricky if not handled right.
    // Actually, we might need to fetch the blob here if we passed a URL, OR pass the ArrayBuffer/Base64.
    
    // Strategy: Pass the Data URL or the Image URL and fetch it HERE.
    // Ideally we pass the raw data.
    
    try {
        const dirHandle = await getDirectoryHandle();
        if (!dirHandle) throw new Error("No hay carpeta configurada.");
        
        // Convert base64/arraybuffer back to blob if needed
        // For simplicity, let's assume we receive an ArrayBuffer or we fetch local DataUrl
        
        let blob = serializedBlob;
        if (typeof serializedBlob === 'string' && serializedBlob.startsWith('data:')) {
             const res = await fetch(serializedBlob);
             blob = await res.blob();
        } else if (serializedBlob.type === 'Buffer' || Array.isArray(serializedBlob)) {
             blob = new Blob([new Uint8Array(serializedBlob)]);
        }

        // Verify Permission
        const hasPermission = await verifyPermission(dirHandle, true);
        if (!hasPermission) {
            throw new Error("PERMISSION_REQUIRED");
        }

        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
    } catch (err) {
        throw err;
    }
}

async function verifyPermission(fileHandle, readWrite) {
  const options = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  // Check if permission was already granted. If so, return true.
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  // Request permission. If the user grants permission, return true.
  // Note: This fails in Offscreen if user gesture is required and missing, 
  // but it's the only way to try.
  try {
      if ((await fileHandle.requestPermission(options)) === 'granted') {
        return true;
      }
  } catch(e) {
      // Expected failure in offscreen if prompt needed
      return false;
  }
  return false;
}
