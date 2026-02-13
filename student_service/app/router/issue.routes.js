const express = require('express')
const IssueController = require('../controller/issue.controller')
const { Auth } = require('../middleware/Auth')
const router = express.Router()

router.post('/issue', Auth, IssueController.issueBook)
router.put('/issues/return/:id', Auth, IssueController.returnBook)
router.get('/bookissues', Auth, IssueController.getAllIssues)
router.put('/issues/student/:studentId', Auth, IssueController.getIssuesByStudent)
router.get('/dashboard', Auth, IssueController.getDashboardStats)
router.get('/student-library-report', Auth, IssueController.getStudentLibraryReport)
router.patch('/collect-library-payment/:issueId', Auth, IssueController.collectLibraryPayment)

module.exports = router