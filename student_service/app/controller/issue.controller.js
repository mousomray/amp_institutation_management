const IssueModel = require('../model/issue')
const BookModel = require('../model/book')
const StudentModel = require('../model/student')
const SettingsModel = require('../model/setting')
const mongoose = require('mongoose')
const { getStudentFromStudentService } = require('../service/student.service')

class IssueController {

    // Issue a Book
    async issueBook(req, res) {
        try {
            const { book_id, student_id, return_date } = req.body
            const userId = req.user.id

            /* ===== 1. Validate Book ===== */
            const book = await BookModel.findOne({
                _id: book_id,
                isDeleted: false
            })

            if (!book) {
                return res.status(404).json({
                    success: false,
                    message: 'Book not found'
                })
            }

            if (!book.isAvailable) {
                return res.status(400).json({
                    success: false,
                    message: 'Book already issued'
                })
            }

            /* ===== 2. Get Active Settings ===== */
            const settings = await SettingsModel.findOne({
                userId,
                isActive: true
            })

            if (!settings) {
                return res.status(400).json({
                    success: false,
                    message: 'Library settings not configured'
                })
            }

            /* ===== 3. Get Student Data from Student Service ===== */
            const studentData = await getStudentFromStudentService(student_id, req)

            console.log('Fetched student data:', studentData)

            if (!studentData) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                })
            }

            /* ===== 4. Create Issue Record (Snapshot) ===== */
            const issue = await IssueModel.create({
                book_id,
                student_id,
                student_snapshot: {
                    name: studentData.name,
                    email: studentData.email,
                    phone: studentData.phone,
                    roll: studentData.roll
                },
                book_fee: book.book_fee || settings.book_fee,
                late_fine: book.late_fine || settings.late_fine,
                return_date,
                userId
            })

            /* ===== 5. Update Book Availability ===== */
            book.isAvailable = false
            await book.save()

            return res.status(201).json({
                success: true,
                message: 'Book issued successfully',
                data: issue
            })

        } catch (error) {
            console.error(error)
            return res.status(500).json({
                success: false,
                message: 'Error issuing book',
                error: error.message
            })
        }
    }

    // Return a Book
    async returnBook(req, res) {
        try {
            const issueId = req.params.id

            const issue = await IssueModel.findById(issueId)
            if (!issue) {
                return res.status(404).json({
                    success: false,
                    message: "Issue record not found"
                })
            }

            if (issue.status === "returned") {
                return res.status(400).json({
                    success: false,
                    message: "Book already returned"
                })
            }
            const actualReturnDate = new Date()
            actualReturnDate.setHours(0, 0, 0, 0)

            const returnDate = new Date(issue.return_date)
            returnDate.setHours(0, 0, 0, 0)

            let delayDays = 0

            if (actualReturnDate > returnDate) {
                const diffTime = actualReturnDate - returnDate
                delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            }

            const fineAmount = delayDays * issue.late_fine
            const totalAmount = issue.book_fee + fineAmount

            issue.actual_return_date = actualReturnDate
            issue.delay_days = delayDays
            issue.total_amount = totalAmount
            issue.status = "returned"

            await issue.save()

            await BookModel.findByIdAndUpdate(issue.book_id, {
                isAvailable: true
            })

            return res.status(200).json({
                success: true,
                message: "Book returned successfully",
                delay_days: delayDays,
                book_fee: issue.book_fee,
                fine_per_day: issue.late_fine,
                total_fine: fineAmount,
                total_amount: totalAmount
            })

        } catch (error) {
            console.error("Return book error:", error)
            return res.status(500).json({
                success: false,
                message: "Error returning book"
            })
        }
    }


    // Get all issued books (with full details)
    async getAllIssues(req, res) {
        try {
            const userId = req.user.id   

            const issues = await IssueModel.aggregate([
                {
                    $match: {
                        userId: userId   
                    }
                },

                {
                    $lookup: {
                        from: 'books',
                        localField: 'book_id',
                        foreignField: '_id',
                        as: 'book'
                    }
                },
                {
                    $unwind: {
                        path: '$book',
                        preserveNullAndEmptyArrays: true
                    }
                },

                {
                    $addFields: {
                        issue_duration_days: {
                            $dateDiff: {
                                startDate: '$issue_date',
                                endDate: {
                                    $cond: [
                                        { $ifNull: ['$actual_return_date', false] },
                                        '$actual_return_date',
                                        '$$NOW'
                                    ]
                                },
                                unit: 'day'
                            }
                        },

                        delay_days: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$actual_return_date', null] },
                                        { $gt: ['$actual_return_date', '$return_date'] }
                                    ]
                                },
                                {
                                    $dateDiff: {
                                        startDate: '$return_date',
                                        endDate: '$actual_return_date',
                                        unit: 'day'
                                    }
                                },
                                0
                            ]
                        }
                    }
                },

                {
                    $project: {
                        book_id: 1,
                        student_id: 1,
                        issue_date: 1,
                        return_date: 1,
                        actual_return_date: 1,
                        book_fee: 1,
                        late_fine: 1,
                        total_amount: 1,
                        status: 1,
                        issue_duration_days: 1,
                        delay_days: 1,

                        book: {
                            _id: 1,
                            name: 1,
                            authorName: 1,
                            language: 1
                        }
                    }
                },

                { $sort: { createdAt: -1 } }
            ])

            const finalResult = []

            for (let issue of issues) {
                let studentData = null

                try {
                    studentData = await getStudentFromStudentService(issue.student_id, req)
                } catch (err) {
                    console.log('Student service error:', err.message)
                }

                finalResult.push({
                    ...issue,
                    student: studentData || null
                })
            }

            return res.status(200).json({
                success: true,
                total: finalResult.length,
                data: finalResult
            })

        } catch (error) {
            console.error(error)
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch issued books'
            })
        }
    }



    //  Get issues by student
    async getIssuesByStudent(req, res) {
        const studentId = req.params.studentId

        try {
            const issues = await IssueModel.aggregate([
                {
                    $match: {
                        student_id: new mongoose.Types.ObjectId(studentId)
                    }
                },
                {
                    $lookup: {
                        from: "books",
                        localField: "book_id",
                        foreignField: "_id",
                        as: "book"
                    }
                },
                { $unwind: "$book" },

                {
                    $project: {
                        _id: 1,
                        issue_date: 1,
                        return_date: 1,
                        actual_return_date: 1,
                        base_rate: 1,
                        fine: 1,
                        total_amount: 1,
                        status: 1,

                        "book._id": 1,
                        "book.name": 1,
                        "book.authorName": 1
                    }
                }
            ])

            res.status(200).json({
                message: "Student issue history fetched",
                total: issues.length,
                data: issues
            })

        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error fetching student issues" })
        }
    }

    // Dashboard Stats
    async getDashboardStats(req, res) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Total books
            const totalBooks = await BookModel.countDocuments({ isDeleted: false });
            const availableBooks = await BookModel.countDocuments({ isDeleted: false, isAvailable: true });
            const issuedBooks = await BookModel.countDocuments({ isDeleted: false, isAvailable: false });

            // Total students
            const totalStudents = await StudentModel.countDocuments({ isDeleted: false });

            // Today issued
            const todayIssued = await IssueModel.countDocuments({
                issue_date: { $gte: today, $lt: tomorrow }
            });

            // Today returned
            const todayReturned = await IssueModel.countDocuments({
                actual_return_date: { $gte: today, $lt: tomorrow },
                status: 'returned'
            });

            // Total fine collected
            const fineResult = await IssueModel.aggregate([
                { $match: { status: 'returned' } },
                { $group: { _id: null, totalFine: { $sum: '$fine' } } }
            ]);
            const totalFineCollected = fineResult.length > 0 ? fineResult[0].totalFine : 0;

            // Recent activities (last 10)
            const recentActivities = await IssueModel.aggregate([
                { $sort: { issue_date: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'students',
                        localField: 'student_id',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                { $unwind: '$student' },
                {
                    $lookup: {
                        from: 'books',
                        localField: 'book_id',
                        foreignField: '_id',
                        as: 'book'
                    }
                },
                { $unwind: '$book' },
                {
                    $project: {
                        student_name: '$student.name',
                        book_name: '$book.name',
                        issue_date: 1,
                        return_date: 1,
                        actual_return_date: 1,
                        fine: 1,
                        status: 1
                    }
                }
            ]);

            // Overdue books
            const overdueBooks = await IssueModel.aggregate([
                {
                    $match: {
                        status: 'issued',
                        return_date: { $lt: today }
                    }
                },
                {
                    $lookup: {
                        from: 'students',
                        localField: 'student_id',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                { $unwind: '$student' },
                {
                    $lookup: {
                        from: 'books',
                        localField: 'book_id',
                        foreignField: '_id',
                        as: 'book'
                    }
                },
                { $unwind: '$book' },
                {
                    $project: {
                        student_name: '$student.name',
                        book_name: '$book.name',
                        return_date: 1,
                        base_rate: 1,
                        lateDays: {
                            $ceil: {
                                $divide: [
                                    { $subtract: [today, '$return_date'] },
                                    1000 * 60 * 60 * 24
                                ]
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        estimatedFine: { $multiply: ['$lateDays', '$base_rate'] }
                    }
                }
            ]);

            res.status(200).json({
                message: 'Dashboard stats fetched successfully',
                data: {
                    summary: {
                        totalBooks,
                        availableBooks,
                        issuedBooks,
                        totalStudents,
                        todayIssued,
                        todayReturned,
                        totalFineCollected
                    },
                    recentActivities,
                    overdueBooks
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching dashboard stats' });
        }
    }
}

module.exports = new IssueController()
