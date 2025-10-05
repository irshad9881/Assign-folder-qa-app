const { dbRun, dbGet } = require('../../../lib/database');
const { deleteCollection } = require('../../../lib/vectorStore');

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { name } = req.body;
      await dbRun('UPDATE folders SET name = ? WHERE id = ?', [name, id]);
      
      const folder = await dbGet('SELECT * FROM folders WHERE id = ?', [id]);
      res.status(200).json(folder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update folder' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await dbRun('DELETE FROM folders WHERE id = ?', [id]);
      await deleteCollection(id);
      
      res.status(200).json({ message: 'Folder deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete folder' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}