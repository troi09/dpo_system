import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const slugify = (str = "") =>
  String(str)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");

export const getDateRequestFolder = () =>
  `${new Date().toLocaleDateString("en-US").replaceAll("/", "-")}_${Date.now()}`;

export async function uploadRequirements(files, requestType, studentName, requestFolder) {
  const uploaded = [];
  const studentSlug = slugify(studentName);
  const folder = requestFolder;

  for (const file of Array.from(files || [])) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `requests/${studentSlug}/${requestType}/${folder}/${Date.now()}_${safeName}`;

    const fileRef = ref(storage, path);
    const snap = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snap.ref);

    uploaded.push({
      originalName: file.name,
      url,
      path,
      contentType: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      requestFolder: folder, // helpful for debugging/display
    });
  }

  return uploaded;
}
