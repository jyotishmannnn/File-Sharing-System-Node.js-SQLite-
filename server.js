const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

// Initialize SQLite database
const db = new sqlite3.Database('./file_sharing.db');

// Create the files table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT,
    random_code TEXT,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: './uploads', // Directory where files will be stored locally
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to avoid name conflicts
    }
});
const upload = multer({ storage });

// Serve static HTML files (e.g., share.html, receive.html)
app.use(express.static('public'));

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const randomCode = Math.random().toString(36).substr(2, 6).toUpperCase(); // Generate a random code
    const fileName = req.file.filename;

    // Insert file details into the SQLite database
    db.run(`INSERT INTO files (file_name, random_code) VALUES (?, ?)`, [fileName, randomCode], (err) => {
        if (err) {
            console.error(err); // Log the error
            return res.status(500).json({ message: 'Error uploading file' });
        }
        res.json({ message: 'File uploaded successfully', code: randomCode });
    });
});

// Route to retrieve file by random code
app.get('/receive/:code', (req, res) => {
    const code = req.params.code;
    db.get('SELECT * FROM files WHERE random_code = ?', [code], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ message: 'File not found' });
        }
        res.json({ file_name: row.file_name, upload_time: row.upload_time });
    });
});

// Route to download file by random code
app.get('/download/:code', (req, res) => {
    const code = req.params.code;
    db.get('SELECT * FROM files WHERE random_code = ?', [code], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ message: 'File not found' });
        }
        const filePath = path.join(__dirname, 'uploads', row.file_name);
        res.download(filePath, row.file_name, (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Could not download the file.');
            }
        });
    });
});

// Start the server on port 3000
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
