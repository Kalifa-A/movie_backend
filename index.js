const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
console.log("--- SERVER STARTING ---");
console.log("JWT Secret Key:", process.env.JWT_SECRET ? "FOUND" : "NOT FOUND");
console.log("Mongo URI:", process.env.MONGO_URI ? "FOUND" : "NOT FOUND");
const User = require('./models/User');
const Movie = require('./models/Movie');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- 1. THE MISSING AUTH MIDDLEWARE ---
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: "No token, authorization denied" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // This puts the user ID into the request
        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

// --- 2. AUTH ROUTES (Register & Login) ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User registered" });
    } catch (err) {
        res.status(400).json({ error: "User already exists" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 3. WATCHLIST ROUTES (Now Protected with 'auth') ---

// Get User's Watchlist
app.get('/api/watchlist', auth, async (req, res) => {
    try {
        const movies = await Movie.find({ userId: req.user.id }).sort({ addedAt: -1 });
        res.status(200).json(movies);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add to Watchlist
app.post('/api/watchlist', auth, async (req, res) => {
    try {
        const { movieId, title, poster_path, vote_average } = req.body;

        const alreadyExists = await Movie.findOne({ 
            userId: req.user.id, 
            movieId: movieId 
        });

        if (alreadyExists) {
            return res.status(400).json({ message: "Already in your watchlist" });
        }

        const newMovie = new Movie({
            userId: req.user.id,
            movieId,
            title,
            poster_path,
            vote_average
        });

        await newMovie.save();
        res.status(201).json(newMovie);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Remove from Watchlist
app.delete('/api/watchlist/:id', auth, async (req, res) => {
    try {
        await Movie.findOneAndDelete({ movieId: req.params.id, userId: req.user.id });
        res.status(200).json({ message: "Removed from Watchlist" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ Database connection error:', err));

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server flowing on http://localhost:${PORT}`));
}

module.exports = app;
