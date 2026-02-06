const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Simple in-memory data
let contacts = [
    { id: 1, name: 'John Doe', email: 'john@example.com', company: 'Acme Corp', phone: '+1-555-0100' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', company: 'Tech Inc', phone: '+1-555-0200' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', company: 'StartCo', phone: '+1-555-0300' },
];

app.get('/', (req, res) => {
    res.json({
        message: 'CRM Platform API',
        version: '1.0.0',
        status: 'running'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/contacts', (req, res) => {
    res.json({ contacts, total: contacts.length });
});

app.post('/contacts', (req, res) => {
    const newContact = {
        id: contacts.length + 1,
        ...req.body
    };
    contacts.push(newContact);
    res.status(201).json(newContact);
});

app.get('/contacts/:id', (req, res) => {
    const contact = contacts.find(c => c.id === parseInt(req.params.id));
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json(contact);
});

app.put('/contacts/:id', (req, res) => {
    const index = contacts.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Contact not found' });
    contacts[index] = { ...contacts[index], ...req.body };
    res.json(contacts[index]);
});

app.delete('/contacts/:id', (req, res) => {
    const index = contacts.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Contact not found' });
    contacts.splice(index, 1);
    res.json({ message: 'Contact deleted' });
});

app.get('/stats', (req, res) => {
    res.json({
        totalContacts: contacts.length,
        companies: [...new Set(contacts.map(c => c.company))].length,
        recentActivity: 15,
        deadlines: 3
    });
});

const PORT = 8004;
app.listen(PORT, () => {
    console.log(`CRM Platform API running on http://localhost:${PORT}`);
});
