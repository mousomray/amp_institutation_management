const express = require('express')
const BookController = require('../controller/book.controller')
const uploadImage = require('../helper/imagehandler') // Image handle Area
const { Auth } = require('../middleware/Auth')
const router = express.Router()
const { upload } = require("../middleware/multer.js")
// const {uploadStudentImages} = require("../middleware/multiMulter.js")

router.post('/createbook', Auth, upload.single('image'), BookController.create) // Add student
router.get('/allbooks', Auth, BookController.getall)
router.get('/singlebook/:id', Auth, BookController.getsingle)
router.put('/updatebook/:id', upload.single('image'), Auth, BookController.bookupdate)
router.delete('/deletebook/:id', Auth, BookController.bookdelete)

module.exports = router