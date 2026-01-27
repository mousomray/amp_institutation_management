const mongoose = require('mongoose')
const Schema = mongoose.Schema

const BookSchema = new Schema({
    name: {
        type: String,
        required: "Name is Required",
        minlength: [3, 'Name must be at least 3 characters long']
    },
    authorName: {
        type: String,
        required: "Author name is Required",
        minlength: [3, 'Author Name must be at least 3 characters long']
    },
    language: {
        type: String,
        required: "Language is Required",
        minlength: [3, 'Language must be at least 3 characters long']
    },
    image: {
        type: String,
        required: "Image is required"
    },
    description: {
        type: String,
        required: "Description is Required",
        minlength: [3, 'Description must be at least 3 characters long']
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const BookModel = mongoose.model('book', BookSchema);

module.exports = BookModel;