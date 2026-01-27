const express = require('express')
const BookController = require('../controller/book.controller')
const uploadImage = require('../helper/imagehandler') // Image handle Area
const { Auth } = require('../middleware/Auth')
const router = express.Router()

router.post('/createbook', Auth, uploadImage.single('image'), BookController.create) // Add student
router.get('/allbooks', BookController.getall)
router.get('/singlebook/:id', BookController.getsingle)
router.put('/updatebook/:id', Auth, uploadImage.single('image'), BookController.bookupdate)
router.delete('/deletebook/:id', Auth, BookController.bookdelete)

module.exports = router