const mongoose = require('mongoose');

// We define exactly what we want to save from the TMDB API
const MovieSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link to User
    movieId: { type: Number, required: true },
    title: { type: String, required: true },
    poster_path: { type: String },
    addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Movie', MovieSchema);