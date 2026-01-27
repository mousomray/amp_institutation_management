const IssueModel = require('../model/issue')
const BookModel = require('../model/book')
const StudentModel = require('../model/student')
const mongoose = require('mongoose')

class IssueController {

    // Issue a Book
    async issueBook(req, res) {
        try {
            const { book_id, student_id, base_rate, return_date } = req.body

            // 1Validate student
            const student = await StudentModel.findOne({
                _id: student_id,
                isDeleted: false
            })
            if (!student) {
                return res.status(404).json({ message: "Student not found" })
            }

            // 2 Validate book
            const book = await BookModel.findOne({
                _id: book_id,
                isDeleted: false
            })
            if (!book) {
                return res.status(404).json({ message: "Book not found" })
            }

            // 3 Check availability
            if (!book.isAvailable) {
                return res.status(400).json({ message: "Book is already issued" })
            }

            // 4 Create issue record
            const issue = new IssueModel({
                book_id,
                student_id,
                base_rate,
                return_date
            })

            await issue.save()

            // 5 Update book availability
            book.isAvailable = false
            await book.save()

            res.status(201).json({
                message: "Book issued successfully",
                data: issue
            })

        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error issuing book" })
        }
    }

    // Return a Book
    async returnBook(req, res) {
        const issueId = req.params.id;
        try {
            const issue = await IssueModel.findById(issueId);
            if (!issue) {
                return res.status(404).json({ message: "Issue record not found" });
            }
            if (issue.status === "returned") {
                return res.status(400).json({ message: "Book already returned" });
            }
            const actualReturnDate = new Date();
            actualReturnDate.setHours(0, 0, 0, 0);
            const returnDate = new Date(issue.return_date);
            returnDate.setHours(0, 0, 0, 0);
            issue.actual_return_date = actualReturnDate;
            let lateDays = 0;
            let fine = 0;
            if (actualReturnDate > returnDate) {
                const diffTime = actualReturnDate - returnDate;
                lateDays = diffTime / (1000 * 60 * 60 * 24); 
                fine = lateDays * issue.base_rate;
            }

            issue.fine = fine;
            issue.total_amount = issue.base_rate + fine;
            issue.status = "returned";

            await issue.save();

            // Make book available again
            await BookModel.findByIdAndUpdate(issue.book_id, {
                isAvailable: true
            });

            return res.status(200).json({
                message: "Book returned successfully",
                lateDays,
                base_rate: issue.base_rate,
                fine,
                total_amount: issue.total_amount
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Error returning book" });
        }
    }



    //  Get all issued books
    async getAllIssues(req, res) {
        try {
            const issues = await IssueModel.aggregate([
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
                    $lookup: {
                        from: "students",
                        localField: "student_id",
                        foreignField: "_id",
                        as: "student"
                    }
                },
                { $unwind: "$student" },
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
                        "book.authorName": 1,

                        "student._id": 1,
                        "student.name": 1,
                        "student.email": 1,
                        "student.phone": 1
                    }
                }
            ])

            res.status(200).json({
                message: "Issued books fetched successfully",
                total: issues.length,
                data: issues
            })

        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error fetching issue data" })
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
