const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    grade: { type: Number, required: true },
});

const bookSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    title: { type: String, required: true },
    author: { type: String, required: true },
    imageUrl: { type: String, required: true },
    year: { type: Number, required: true },
    genre: { type: String, required: true },
    ratings: {
        type: [ratingSchema],
        default: [],
    },
    averageRating: { type: Number, default: 0 },
});

const Book = mongoose.model("Book", bookSchema);
module.exports = Book;
