import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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

export async function uploadRequirements(files, requestType, studentName, requestFolder) {
  const uploaded = [];
  const studentSlug = slugify(studentName);
  const folder = requestFolder || getDateRequestFolder();

  for (const file of Array.from(files || [])) {
    const name = safeFileName(file.name);

    // <slugify_name_folder>/<requests_folder>/<request_type_folder>/<date_timestamp_folder>/<actual file>
    const path = `${studentSlug}/requests/${requestType}/${folder}/${name}`;

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
      requestFolder: folder,
    });
  }

  return uploaded;
}
