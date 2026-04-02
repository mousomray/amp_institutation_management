const mongoose = require('mongoose')
const Schema = mongoose.Schema

const StudentSchema = new Schema({
    name: {
        type: String,
        required: "Name is Required",
        minlength: [3, 'Name must be at least 3 characters long']
    },
    email: {
        type: String,
        required: "Email is Required",
        match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Email address should follow the format: abc@gmail.com']
    },
    phone: {
        type: Number,
        required: "Phone number is Required",
        min: [1000000000, 'Phone number must be exactly 10 digits'],
        max: [9999999999, 'Phone number must be exactly 10 digits']
    },
     address: {
        type: String,
        required: "Address is Required",
        minlength: [3, 'Address must be at least 3 characters long']
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const StudentModel = mongoose.model('student', StudentSchema);

module.exports = StudentModel;