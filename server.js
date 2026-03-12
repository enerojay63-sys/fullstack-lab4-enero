const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-secret-key-2025';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory user database
let users = [
    {
        id: 1,
        email: 'admin@example.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // Password123!
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        verified: true
    }
];

// API Route: Register
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    const existing = users.find(u => u.email === email);
    if (existing) {
        return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        id: users.length + 1,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'user',
        verified: false
    };

    users.push(newUser);

    res.status(201).json({ 
        message: 'Registration successful!',
        userId: newUser.id 
    });
});

// API Route: Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.verified) {
        return res.status(403).json({ message: 'Please verify your email first' });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        SECRET_KEY,
        { expiresIn: '24h' }
    );

    res.json({
        message: 'Login successful',
        token,
        user: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        }
    });
});

// API Route: Get Profile (protected)
app.get('/api/profile', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = users.find(u => u.id === decoded.id);
        
        res.json({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});