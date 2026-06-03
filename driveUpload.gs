// ============================================================
// Mecca Residence 2026 — Subida de fotos a Google Drive
// Google Apps Script — Web App (doPost / doGet)
// ============================================================

// Nombre de la carpeta raíz en Drive
var ROOT_FOLDER_NAME = "Mecca Residence 2026";

// ------------------------------------------------------------
// doGet — health check
// Responde con un JSON simple para verificar que el servicio está activo.
// ------------------------------------------------------------
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", app: ROOT_FOLDER_NAME }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------
// doPost — recibe la foto en base64 y la guarda en Drive
//
// Body JSON esperado:
//   image    — data URL en base64 (ej. "data:image/jpeg;base64,/9j/...")
//   fileName — nombre del archivo (ej. "foto_001.jpg")
//   folder   — subcarpeta destino (ej. "N3 — Apto 3B")
//   actId    — identificador de actividad para el log
// ------------------------------------------------------------
function doPost(e) {
  try {
    // Parsear el cuerpo de la solicitud
    var body = JSON.parse(e.postData.contents);

    var dataUrl   = body.image    || "";
    var fileName  = body.fileName || ("foto_" + Date.now() + ".jpg");
    var subFolder = body.folder   || "Sin ubicacion";
    var actId     = body.actId    || "(sin actId)";

    // Validar que llegó la imagen
    if (!dataUrl) {
      throw new Error("El campo 'image' está vacío o no fue enviado.");
    }

    // --- Decodificar el data URL ---
    // Formato esperado: "data:<mimeType>;base64,<datos>"
    var matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error("El campo 'image' no tiene formato data URL válido.");
    }
    var mimeType = matches[1];  // ej. "image/jpeg"
    var base64   = matches[2];  // datos en base64

    // Decodificar base64 a Blob
    var decoded = Utilities.base64Decode(base64);
    var blob    = Utilities.newBlob(decoded, mimeType, fileName);

    // --- Obtener / crear estructura de carpetas ---
    var rootFolder = getOrCreateFolder(ROOT_FOLDER_NAME, null);
    var destFolder = getOrCreateFolder(subFolder, rootFolder);

    // --- Crear el archivo en Drive ---
    var file = destFolder.createFile(blob);

    // Configurar permiso de visualización para cualquiera con el enlace
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();

    // URLs de acceso
    var url      = "https://drive.google.com/uc?export=view&id=" + fileId;
    var thumbUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w800";

    // Log en la consola de Apps Script
    Logger.log("[Mecca Drive] actId=%s | archivo=%s | carpeta=%s | fileId=%s",
               actId, fileName, subFolder, fileId);

    // Respuesta exitosa
    return ContentService
      .createTextOutput(JSON.stringify({
        success:  true,
        fileId:   fileId,
        url:      url,
        thumbUrl: thumbUrl
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // Log del error
    Logger.log("[Mecca Drive] ERROR: %s", err.toString());

    // Respuesta de error
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error:   err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ------------------------------------------------------------
// getOrCreateFolder — helper
//
// Busca una carpeta por nombre dentro del padre indicado.
// Si no existe, la crea. Si parent es null, busca en la raíz de Drive.
//
// @param {string}   name   — nombre de la carpeta a buscar/crear
// @param {Folder}   parent — carpeta padre (DriveApp.Folder) o null para raíz
// @returns {Folder} la carpeta encontrada o recién creada
// ------------------------------------------------------------
function getOrCreateFolder(name, parent) {
  var iterator;

  if (parent === null) {
    // Buscar en la raíz del Drive del usuario
    iterator = DriveApp.getFoldersByName(name);
  } else {
    // Buscar dentro de la carpeta padre
    iterator = parent.getFoldersByName(name);
  }

  if (iterator.hasNext()) {
    // Ya existe — devolver la primera coincidencia
    return iterator.next();
  }

  // No existe — crear la carpeta
  if (parent === null) {
    return DriveApp.createFolder(name);
  } else {
    return parent.createFolder(name);
  }
}
