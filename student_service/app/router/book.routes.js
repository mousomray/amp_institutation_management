const express = require('express')
const BookController = require('../controller/book.controller')
const uploadImage = require('../helper/imagehandler') // Image handle Area
const { Auth } = require('../middleware/Auth')
const router = express.Router()
const {upload} = require("../middleware/multer.js")
// const {uploadStudentImages} = require("../middleware/multiMulter.js")

router.post('/createbook',upload.single('image'), BookController.create) // Add student
router.get('/allbooks', BookController.getall)
router.get('/singlebook/:id', BookController.getsingle)
router.put('/updatebook/:id', uploadImage.single('image'), BookController.bookupdate)
router.delete('/deletebook/:id', BookController.bookdelete)

module.exports = router