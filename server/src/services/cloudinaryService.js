const cloudinary = require('cloudinary').v2;
const https = require('https');
const http = require('http');

let configured = false;
const ensureConfigured = () => {
  if (configured) return true;
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
    access_mode: 'public',
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
    access_mode: 'public',
  });
  return result.secure_url;
};

// Extract Cloudinary public_id from a secure_url
// e.g. https://res.cloudinary.com/cloud/raw/upload/v123/vaultrag/prds/file.pdf
//   → vaultrag/prds/file.pdf
const publicIdFromUrl = (url) => {
  const m = url.match(/\/(?:raw|image|video)\/upload\/(?:v\d+\/)?(.+)$/);
  return m ? m[1] : null;
};

// Generate a signed URL — note: expires_at only works for type:'authenticated',
// not type:'upload'. For public uploads, sign_url:true alone adds the signature.
const getSignedUrl = (originalUrl, resourceType = 'raw') => {
  if (!ensureConfigured() || !originalUrl) return originalUrl;
  const publicId = publicIdFromUrl(originalUrl);
  if (!publicId) return originalUrl;
  const signed = cloudinary.url(publicId, {
    resource_type: resourceType,
    type: 'upload',
    sign_url: true,
    secure: true,
  });
  console.log('[cloudinary] signed URL:', signed.substring(0, 120));
  return signed;
};

// Follow HTTP/HTTPS redirects (Node's https.get does not follow them automatically)
const fetchFollowRedirects = (url, depth = 0) =>
  new Promise((resolve, reject) => {
    if (depth > 5) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      const loc = res.headers.location;
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && loc) {
        res.resume(); // drain so socket is released
        resolve(fetchFollowRedirects(loc, depth + 1));
      } else {
        resolve(res);
      }
    }).on('error', reject);
  });

// Stream a Cloudinary file through the server (proxy) — pipes raw bytes to an Express res
const proxyCloudinaryFile = async (signedUrl, res, mimeType, filename) => {
  const upstream = await fetchFollowRedirects(signedUrl);
  console.log('[cloudinary-proxy] status:', upstream.statusCode, 'mime:', mimeType);
  if (upstream.statusCode !== 200) {
    upstream.resume();
    return res.status(502).json({ error: `Cloudinary returned ${upstream.statusCode}` });
  }
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  upstream.pipe(res);
  return new Promise((resolve) => upstream.on('end', resolve));
};

module.exports = { uploadImage, uploadFile, getSignedUrl, proxyCloudinaryFile };
