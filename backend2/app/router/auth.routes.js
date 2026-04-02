const express = require('express')
const uploadImage = require('../helper/imagehandler') // Image handle Area
const authcontroller = require('../controller/auth.controller')
const { Auth } = require('../middleware/Auth')
const router = express.Router()

router.post('/register', uploadImage.single('image'), authcontroller.register) // Register
router.post('/login', authcontroller.login) // Login
router.get('/dashboard', Auth, authcontroller.dashboard) // Dashboard Data

module.exports = router