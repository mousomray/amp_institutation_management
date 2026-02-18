const dotenv = require('dotenv')
dotenv.config()
const nodemailer = require('nodemailer')

// This code is came from nodemailer documentation
let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
    },
})

module.exports = transporter 