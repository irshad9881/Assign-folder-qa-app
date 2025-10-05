const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { dbRun } = require('../../../lib/database');
const { processDocument } = require('../../../lib/documentProcessor');

const upload = multer({
  dest: './uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowedTypes.includes(ext));
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

export const config = {
  api: {
    bodyParser: false,
  },
};

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await runMiddleware(req, res, upload.single('file'));
    
    const { folderId } = req.body;
    const file = req.file;
    
    if (!file || !folderId) {
      return res.status(400).json({ error: 'File and folder ID required' });
    }

    const documentId = uuidv4();
    
    await dbRun(
      'INSERT INTO documents (id, folder_id, name, file_path, size, status) VALUES (?, ?, ?, ?, ?, ?)',
      [documentId, folderId, file.originalname, file.path, file.size, 'processing']
    );

    processDocument(documentId, folderId, file.path, file.originalname);

    res.status(201).json({
      id: documentId,
      name: file.originalname,
      size: file.size,
      status: 'processing'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}