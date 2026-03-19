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

// In-memory database
let users = [];
let departments = [
    { id: 1, name: 'Engineering', description: 'Software development' },
    { id: 2, name: 'HR', description: 'Human Resources' }
];
let employees = [];
let requests = [];

// Seed admin user
async function seedDatabase() {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    users = [
        {
            id: 1,
            email: 'admin@example.com',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            verified: true,
            createdAt: new Date().toISOString()
        }
    ];
    console.log('✅ Admin user seeded');
}
// Middleware: Verify Token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
}

// Middleware: Check if Admin
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}

// ==================== PUBLIC ROUTES ====================

// Register
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
        verified: false,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);

    res.status(201).json({ 
        message: 'Registration successful! Please verify your email.',
        email: newUser.email
    });
});

// Verify Email (simulated)
app.post('/api/verify-email', (req, res) => {
    const { email } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    user.verified = true;

    res.json({ message: 'Email verified successfully! You can now login.' });
});

// Login
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
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        }
    });
});

// ==================== PROTECTED ROUTES ====================

// Get Profile
app.get('/api/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    
    res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
    });
});

// ==================== ADMIN ROUTES ====================

// Get all accounts
app.get('/api/admin/accounts', authenticateToken, requireAdmin, (req, res) => {
    const accountsList = users.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        verified: u.verified,
        createdAt: u.createdAt
    }));

    res.json({ accounts: accountsList });
});

// Get all departments
app.get('/api/admin/departments', authenticateToken, requireAdmin, (req, res) => {
    res.json({ departments });
});

// Get all employees
app.get('/api/admin/employees', authenticateToken, requireAdmin, (req, res) => {
    res.json({ employees });
});

// Start server
async function startServer() {
    await seedDatabase();
    app.listen(PORT, () => {
        console.log(`✅ Backend server running at http://localhost:${PORT}`);
        console.log(`📊 Default admin: admin@example.com / Password123!`);
    });
}

startServer();