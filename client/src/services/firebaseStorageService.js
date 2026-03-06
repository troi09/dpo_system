import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase";

const slugify = (str = "") =>
  String(str)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");

const safeFileName = (name = "") =>
  String(name).replace(/[^a-zA-Z0-9._-]/g, "_");

// date_timestamp folder example: "2-16-2026_1139" or "2-16-2026_2329"
export const getDateRequestFolder = () => {
  const d = new Date();
  const date = d.toLocaleDateString("en-US").replaceAll("/", "-"); // M-D-YYYY
  const hhmm = `${String(d.getHours()).padStart(2, "0")}${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
  return `${date}_${hhmm}`;
};

export async function uploadRequirements(files, type, studentName, requestFolder) {
  const uploaded = [];
  const studentSlug = slugify(studentName);
  const folder = requestFolder || getDateRequestFolder();

  for (const file of Array.from(files || [])) {
    const name = safeFileName(file.name);

    // <slugify_name_folder>/<requests_folder>/<request_type_folder>/<date_timestamp_folder>/<actual file>
    const path = `${studentSlug}/requests/${type}/${folder}/${name}`;

    const fileRef = ref(storage, path);
    const snap = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snap.ref);

    uploaded.push({
      origName: file.name,
      url,
      path,
      contentType: file.type,
      uploadedAt: new Date().toISOString(),
      requestFolder: folder,
    });
  }

  return uploaded;
}

export async function uploadApprovedForm(pdfBlob, type, studentName, requestFolder, fileName) {
  const studentSlug = slugify(studentName);
  const safeName = safeFileName(fileName);

  const path = `${studentSlug}/requests/${type}/${requestFolder}/approved_form/${safeName}`;

  const typedBlob = new Blob([pdfBlob], { type: "application/pdf" });
  const meta = { contentType: "application/pdf" };

  const fileRef = ref(storage, path);
  const snap = await uploadBytes(fileRef, typedBlob, meta);
  const url = await getDownloadURL(snap.ref);

  return { url, path, issuedAt: new Date().toISOString() };
}

export async function uploadApprovedQrImage(qrDataUrl, type, studentName, requestFolder) {
  const studentSlug = slugify(studentName);
  const path = `${studentSlug}/requests/${type}/${requestFolder}/approved_form/qr_code.png`;

  const qrBlob = await fetch(qrDataUrl).then((res) => res.blob());
  const meta = { contentType: "image/png" };

  const fileRef = ref(storage, path);
  const snap = await uploadBytes(fileRef, qrBlob, meta);
  const url = await getDownloadURL(snap.ref);

  return { url, path };
}

/**
 * Upload a base64 signature data URL as a PNG to Firebase Storage.
 * Returns { url, path }.
 */
export async function uploadSignatureImage(dataUrl, type, studentName, requestFolder, sigName) {
  const studentSlug = slugify(studentName);
  const path = `${studentSlug}/requests/${type}/${requestFolder}/sigs/${sigName}`;

  const blob = await fetch(dataUrl).then((r) => r.blob());
  const meta = { contentType: "image/png" };

  const fileRef = ref(storage, path);
  const snap = await uploadBytes(fileRef, blob, meta);
  const url = await getDownloadURL(snap.ref);

  return { url, path };
}

/**
 * Upload a File object for the representative's government ID.
 * Returns { origName, url, path, contentType, uploadedAt }.
 */
export async function uploadRepGovId(file, type, studentName, requestFolder) {
  const studentSlug = slugify(studentName);
  const name = safeFileName(file.name);
  const path = `${studentSlug}/requests/${type}/${requestFolder}/rep_docs/${name}`;

  const fileRef = ref(storage, path);
  const snap = await uploadBytes(fileRef, file);
  const url = await getDownloadURL(snap.ref);

  return {
    origName: file.name,
    url,
    path,
    contentType: file.type,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Delete a file from Firebase Storage by its storage path.
 * Silently ignores not-found errors.
 */
export async function deleteStorageFile(filePath) {
  if (!filePath) return;
  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn("deleteStorageFile:", err.message);
  }
}