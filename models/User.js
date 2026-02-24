const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // We will hash this!
});

module.exports = mongoose.model('User', UserSchema);