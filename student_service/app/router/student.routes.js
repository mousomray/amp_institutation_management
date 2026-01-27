const express = require('express')
const StudentController = require('../controller/student.controller')
const { Auth } = require('../middleware/Auth')
const router = express.Router()

router.post('/createstudent',Auth, StudentController.create) // Add student
router.get('/allstudents',Auth, StudentController.getall) // Get all student
router.get('/singlestudent/:id', Auth, StudentController.getsingle) // Single Student
router.put('/updatestudent/:id', Auth, StudentController.studentupdate) // Update Student
router.delete('/deletestudent/:id', Auth, StudentController.studentdelete) // Delete Student

module.exports = router