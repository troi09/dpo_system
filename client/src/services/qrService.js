import QRCode from "qrcode";

export const buildVerificationUrl = (serialNo) =>
  `${window.location.origin}/verify/${serialNo}`;

export const generateQrDataUrl = async (url) => {
  return QRCode.toDataURL(url, { margin: 1, width: 180 });
};