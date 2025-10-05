const { dbAll } = require('../../../lib/database');

export default async function handler(req, res) {
  const { folderId } = req.query;

  if (req.method === 'GET') {
    try {
      const documents = await dbAll(
        'SELECT * FROM documents WHERE folder_id = ? ORDER BY uploaded_at DESC',
        [folderId]
      );
      res.status(200).json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}