const cloudinary = require('cloudinary').v2;

let configured = false;
const ensureConfigured = () => {
  if (configured) return true;
  // CLOUDINARY_URL format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  if (process.env.CLOUDINARY_URL) {
    const match = process.env.CLOUDINARY_URL.match(/^cloudinary:\/\/(\d+):([^@]+)@(.+)$/);
    if (match) {
      cloudinary.config({ api_key: match[1], api_secret: match[2], cloud_name: match[3] });
      configured = true;
      return true;
    }
  }
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    configured = true;
    return true;
  }
  return false;
};

const uploadBuffer = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });

const uploadImage = async (buffer, filename) => {
  if (!ensureConfigured()) return null;
  const result = await uploadBuffer(buffer, {
    folder: 'vaultrag/mockups',
    public_id: filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_'),
    resource_type: 'image',
    overwrite: true,
  });
  return result.secure_url;
};

const uploadFile = async (buffer, filename) => {
  if (!ensureConfigured()) return null;
  const result = await uploadBuffer(buffer, {
    folder: 'vaultrag/prds',
    public_id: filename.replace(/[^a-zA-Z0-9_.-]/g, '_'),
    resource_type: 'raw',
    overwrite: true,
  });
  return result.secure_url;
};

module.exports = { uploadImage, uploadFile };
