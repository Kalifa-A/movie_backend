const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Movie = require('./models/Movie');

const app = express();

// --- 1. CLEANED CORS (DO NOT REPEAT BELOW) ---
app.use(cors({
  origin: [
    "https://instant-movie-update.vercel.app", 
    "http://localhost:5173"
  ],
  credentials: true,
  allowedHeaders: ["Content-Type", "x-auth-token"]
}));

app.use(express.json());

// --- 2. AUTH MIDDLEWARE ---
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: "No token, authorization denied" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

// --- 3. AUTH ROUTES ---
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

// --- 4. WATCHLIST ROUTES ---
app.get('/api/watchlist', auth, async (req, res) => {
    try {
        const movies = await Movie.find({ userId: req.user.id }).sort({ addedAt: -1 });
        res.status(200).json(movies);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

app.delete('/api/watchlist/:id', auth, async (req, res) => {
    try {
        await Movie.findOneAndDelete({ movieId: req.params.id, userId: req.user.id });
        res.status(200).json({ message: "Removed from Watchlist" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 5. DATABASE & SERVER ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ Database connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
