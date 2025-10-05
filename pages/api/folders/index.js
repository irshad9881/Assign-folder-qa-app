const { v4: uuidv4 } = require('uuid');
const { initDB, dbRun, dbAll } = require('../../../lib/database');

export default async function handler(req, res) {
  await initDB();

  if (req.method === 'GET') {
    try {
      const folders = await dbAll('SELECT * FROM folders ORDER BY created_at DESC');
      res.status(200).json(folders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch folders' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name } = req.body;
      const id = uuidv4();
      
      await dbRun('INSERT INTO folders (id, name) VALUES (?, ?)', [id, name]);
      
      const folder = { id, name, created_at: new Date().toISOString() };
      res.status(201).json(folder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create folder' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}