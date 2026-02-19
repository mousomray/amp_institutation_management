const IssueModel = require('../model/issue')
const BookModel = require('../model/book')
const StudentModel = require('../model/student')
const SettingsModel = require('../model/setting')
const mongoose = require('mongoose')
const { getStudentFromStudentService } = require('../service/student.service')
const puppeteer = require("puppeteer-core")
const path = require("path")
const ejs = require("ejs")

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
            const userId = req.user.id;

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Total count
            const totalCountAgg = await IssueModel.aggregate([
                { $match: { userId: userId } },
                { $count: "total" }
            ]);
            const total = totalCountAgg[0]?.total || 0;

            const issues = await IssueModel.aggregate([
                { $match: { userId: userId } },

                // Lookup book
                {
                    $lookup: {
                        from: "books",
                        localField: "book_id",
                        foreignField: "_id",
                        as: "book"
                    }
                },
                { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },

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

                        // 🔥 Newly Added Payment Fields
                        payment_status: 1,
                        payment_date: 1,

                        createdAt: 1,
                        updatedAt: 1,

                        book: {
                            _id: "$book._id",
                            name: "$book.name",
                            authorName: "$book.authorName",
                            language: "$book.language",
                            image: "$book.image"
                        }
                    }
                },

                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]);

            const finalResult = [];

            for (let issue of issues) {
                let studentData = null;
                try {
                    studentData = await getStudentFromStudentService(issue.student_id, req);
                } catch (err) {
                    console.log("Student service error:", err.message);
                }

                finalResult.push({
                    ...issue,
                    student: studentData || null
                });
            }

            return res.status(200).json({
                success: true,
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
                data: finalResult
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch issued books"
            });
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
            const userId = req.user.id

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)

            /* ================= SUMMARY ================= */

            const totalBooks = await BookModel.countDocuments({
                userId,
                isDeleted: false
            })

            const availableBooks = await BookModel.countDocuments({
                userId,
                isDeleted: false,
                isAvailable: true
            })

            const issuedBooks = await BookModel.countDocuments({
                userId,
                isDeleted: false,
                isAvailable: false
            })

            const todayIssued = await IssueModel.countDocuments({
                userId,
                issue_date: { $gte: today, $lt: tomorrow }
            })

            const todayReturned = await IssueModel.countDocuments({
                userId,
                actual_return_date: { $gte: today, $lt: tomorrow },
                status: 'returned'
            })

            const fineResult = await IssueModel.aggregate([
                { $match: { userId, status: 'returned' } },
                { $group: { _id: null, totalFine: { $sum: '$total_amount' } } }
            ])

            const totalFineCollected =
                fineResult.length > 0 ? fineResult[0].totalFine : 0

            /* ================= RECENT ACTIVITIES ================= */

            const recentIssues = await IssueModel.aggregate([
                { $match: { userId } },
                { $sort: { createdAt: -1 } },
                { $limit: 10 },

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
                        student_id: 1,
                        issue_date: 1,
                        return_date: 1,
                        actual_return_date: 1,
                        total_amount: 1,
                        status: 1,
                        'book.name': 1,
                        'book.image': 1
                    }
                }
            ])

            const recentActivities = []

            for (let issue of recentIssues) {
                const student = await getStudentFromStudentService(issue.student_id, req)

                recentActivities.push({
                    issue_date: issue.issue_date,
                    return_date: issue.return_date,
                    actual_return_date: issue.actual_return_date,
                    status: issue.status,
                    total_amount: issue.total_amount,
                    book: {
                        name: issue.book.name,
                        image: issue.book.image
                    },
                    student: student
                        ? {
                            name: student.name,
                            email: student.email,
                            phone: student.phone
                        }
                        : null
                })
            }

            /* ================= OVERDUE BOOKS ================= */

            const overdueIssues = await IssueModel.aggregate([
                {
                    $match: {
                        userId,
                        status: 'issued',
                        return_date: { $lt: today }
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
                { $unwind: '$book' },

                {
                    $addFields: {
                        lateDays: {
                            $dateDiff: {
                                startDate: '$return_date',
                                endDate: today,
                                unit: 'day'
                            }
                        }
                    }
                },

                {
                    $project: {
                        student_id: 1,
                        return_date: 1,
                        lateDays: 1,
                        book_fee: 1,
                        'book.name': 1,
                        'book.image': 1
                    }
                }
            ])

            const overdueBooks = []

            for (let issue of overdueIssues) {
                const student = await getStudentFromStudentService(issue.student_id, req)

                overdueBooks.push({
                    book: {
                        name: issue.book.name,
                        image: issue.book.image
                    },
                    return_date: issue.return_date,
                    lateDays: issue.lateDays,
                    estimatedFine: issue.lateDays * issue.book_fee,
                    student: student
                        ? {
                            name: student.name,
                            phone: student.phone
                        }
                        : null
                })
            }

            /* ================= FINAL RESPONSE ================= */

            return res.status(200).json({
                success: true,
                data: {
                    summary: {
                        totalBooks,
                        availableBooks,
                        issuedBooks,
                        todayIssued,
                        todayReturned,
                        totalFineCollected
                    },
                    recentActivities,
                    overdueBooks
                }
            })

        } catch (error) {
            console.error('Dashboard error:', error)
            return res.status(500).json({
                success: false,
                message: 'Failed to load dashboard'
            })
        }
    }



    // Student Book Financial Report
    async getStudentLibraryReport(req, res) {
        try {

            const userId = req.user.id
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 5
            const skip = (page - 1) * limit

            const basePipeline = [

                { $match: { userId } },

                {
                    $lookup: {
                        from: "books",
                        localField: "book_id",
                        foreignField: "_id",
                        as: "book"
                    }
                },
                { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },

                /* ✅ Correct Payment Calculation */

                {
                    $addFields: {

                        calculatedFine: {
                            $multiply: [
                                { $ifNull: ["$delay_days", 0] },
                                { $ifNull: ["$late_fine", 0] }
                            ]
                        }
                    }
                },

                {
                    $addFields: {
                        calculatedTotal: {
                            $add: [
                                { $ifNull: ["$book_fee", 0] },
                                "$calculatedFine"
                            ]
                        }
                    }
                },

                {
                    $addFields: {

                        paid_amount: {
                            $cond: [
                                { $eq: ["$payment_status", "paid"] },
                                "$calculatedTotal",
                                { $ifNull: ["$paid_amount", 0] }
                            ]
                        },

                        due_amount: {
                            $cond: [
                                { $eq: ["$payment_status", "paid"] },
                                0,
                                {
                                    $subtract: [
                                        "$calculatedTotal",
                                        { $ifNull: ["$paid_amount", 0] }
                                    ]
                                }
                            ]
                        }
                    }
                },

                {
                    $group: {
                        _id: "$student_id",

                        totalBooks: { $sum: 1 },
                        totalBookFee: { $sum: "$book_fee" },
                        totalFine: { $sum: "$calculatedFine" },
                        totalAmount: { $sum: "$calculatedTotal" },
                        totalPaid: { $sum: "$paid_amount" },
                        totalDue: { $sum: "$due_amount" },

                        books: {
                            $push: {
                                book_id: "$book._id",
                                book_name: "$book.name",
                                book_image: "$book.image",
                                issue_date: "$issue_date",
                                return_date: "$return_date",
                                actual_return_date: "$actual_return_date",
                                delay_days: "$delay_days",

                                book_fee: "$book_fee",
                                fine_amount: "$calculatedFine",
                                total_amount: "$calculatedTotal",
                                paid_amount: "$paid_amount",
                                due_amount: "$due_amount",
                                payment_status: "$payment_status",
                                status: "$status"
                            }
                        }
                    }
                },

                { $sort: { totalAmount: -1 } }
            ]

            const result = await IssueModel.aggregate([
                ...basePipeline,
                {
                    $facet: {

                        paginatedData: [
                            { $skip: skip },
                            { $limit: limit }
                        ],

                        allData: [
                            { $match: {} }
                        ],

                        totalCount: [
                            { $count: "count" }
                        ]
                    }
                }
            ])

            const totalStudents = result[0].totalCount[0]?.count || 0

            const processStudents = async (students) => {

                const finalResult = []

                for (let studentIssue of students) {

                    let studentData = null

                    try {
                        studentData = await getStudentFromStudentService(
                            studentIssue._id,
                            req
                        )
                    } catch (err) {
                        console.log("Student service error:", err.message)
                    }

                    let overallStatus = "unpaid"

                    if (studentIssue.totalDue === 0 && studentIssue.totalAmount > 0) {
                        overallStatus = "paid"
                    } else if (
                        studentIssue.totalPaid > 0 &&
                        studentIssue.totalDue > 0
                    ) {
                        overallStatus = "partial"
                    }

                    finalResult.push({
                        student: studentData
                            ? {
                                id: studentData._id,
                                name: studentData.name,
                                email: studentData.email,
                                phone: studentData.phone,
                                photo: studentData.photo || null
                            }
                            : null,

                        totalBooks: studentIssue.totalBooks,
                        totalBookFee: studentIssue.totalBookFee,
                        totalFine: studentIssue.totalFine,
                        totalAmount: studentIssue.totalAmount,
                        totalPaid: studentIssue.totalPaid,
                        totalDue: studentIssue.totalDue,
                        paymentStatus: overallStatus,
                        books: studentIssue.books
                    })
                }

                return finalResult
            }

            const paginatedFinal = await processStudents(result[0].paginatedData)
            const allFinal = await processStudents(result[0].allData)

            return res.status(200).json({
                success: true,
                totalStudents,
                pagination: {
                    page,
                    limit,
                    pages: Math.ceil(totalStudents / limit)
                },
                data: paginatedFinal,
                allData: allFinal
            })

        } catch (error) {
            console.error(error)
            return res.status(500).json({
                success: false,
                message: "Failed to fetch student library report"
            })
        }
    }

    async getStudentLibraryReportData(req) {

    const userId = req.user.id
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5
    const skip = (page - 1) * limit

    const basePipeline = [

        { $match: { userId } },

        {
            $lookup: {
                from: "books",
                localField: "book_id",
                foreignField: "_id",
                as: "book"
            }
        },
        { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },

        {
            $addFields: {
                calculatedFine: {
                    $multiply: [
                        { $ifNull: ["$delay_days", 0] },
                        { $ifNull: ["$late_fine", 0] }
                    ]
                }
            }
        },

        {
            $addFields: {
                calculatedTotal: {
                    $add: [
                        { $ifNull: ["$book_fee", 0] },
                        "$calculatedFine"
                    ]
                }
            }
        },

        {
            $addFields: {

                paid_amount: {
                    $cond: [
                        { $eq: ["$payment_status", "paid"] },
                        "$calculatedTotal",
                        { $ifNull: ["$paid_amount", 0] }
                    ]
                },

                due_amount: {
                    $cond: [
                        { $eq: ["$payment_status", "paid"] },
                        0,
                        {
                            $subtract: [
                                "$calculatedTotal",
                                { $ifNull: ["$paid_amount", 0] }
                            ]
                        }
                    ]
                }
            }
        },

        {
            $group: {
                _id: "$student_id",

                totalBooks: { $sum: 1 },
                totalBookFee: { $sum: "$book_fee" },
                totalFine: { $sum: "$calculatedFine" },
                totalAmount: { $sum: "$calculatedTotal" },
                totalPaid: { $sum: "$paid_amount" },
                totalDue: { $sum: "$due_amount" },

                books: {
                    $push: {
                        book_name: "$book.name",
                        issue_date: "$issue_date",
                        return_date: "$return_date",
                        actual_return_date: "$actual_return_date",
                        delay_days: "$delay_days",
                        book_fee: "$book_fee",
                        fine_amount: "$calculatedFine",
                        total_amount: "$calculatedTotal",
                        paid_amount: "$paid_amount",
                        due_amount: "$due_amount",
                        payment_status: "$payment_status"
                    }
                }
            }
        },

        { $sort: { totalAmount: -1 } }
    ]

    const studentsRaw = await IssueModel.aggregate(basePipeline)

    const finalResult = []

    for (let studentIssue of studentsRaw) {

        let studentData = null

        try {
            studentData = await getStudentFromStudentService(
                studentIssue._id,
                req
            )
        } catch (err) {
            console.log("Student service error:", err.message)
        }

        let overallStatus = "unpaid"

        if (studentIssue.totalDue === 0 && studentIssue.totalAmount > 0) {
            overallStatus = "paid"
        } else if (
            studentIssue.totalPaid > 0 &&
            studentIssue.totalDue > 0
        ) {
            overallStatus = "partial"
        }

        finalResult.push({
            student: studentData
                ? {
                    id: studentData._id,
                    name: studentData.name,
                    email: studentData.email,
                    phone: studentData.phone,
                    photo: studentData.photo || null
                }
                : null,

            summary: {
                totalBooks: studentIssue.totalBooks,
                totalBookFee: studentIssue.totalBookFee,
                totalFine: studentIssue.totalFine,
                totalAmount: studentIssue.totalAmount,
                totalPaid: studentIssue.totalPaid,
                totalDue: studentIssue.totalDue,
                paymentStatus: overallStatus
            },

            books: studentIssue.books
        })
    }

    return finalResult
}
  

    async generateLibraryPdfReport(req, res) {
        try {

            const students = await this.getStudentLibraryReportData(req)
            const chromePath = process.env.CHROME_PATH
            const browser = await puppeteer.launch({
                headless: "new",
                executablePath: chromePath,
                args: ["--no-sandbox", "--disable-setuid-sandbox"]
            });
            const page = await browser.newPage()
            const html = await ejs.renderFile(
                path.join(__dirname, "../../views/libraryReport.ejs"),
                { students }
            )

            await page.setContent(html, { waitUntil: "networkidle0" })

            const pdfBuffer = await page.pdf({
                format: "A4",
                printBackground: true,
            })

            await browser.close()

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=library-report.pdf"
            })

            res.send(pdfBuffer)

        } catch (error) {
            console.error("Library PDF Error:", error)
            res.status(500).json({
                success: false,
                message: "Failed to generate library PDF"
            })
        }
    }

    

    async collectLibraryPayment(req, res) {
        try {

            const issueId = req.params.issueId
            const userId = req.user.id

            const issue = await IssueModel.findOne({
                _id: issueId,
                userId
            })

            if (!issue) {
                return res.status(404).json({
                    success: false,
                    message: "Issue record not found"
                })
            }

            if (issue.status !== "returned") {
                return res.status(400).json({
                    success: false,
                    message: "Book must be returned before payment"
                })
            }

            if (issue.payment_status === "paid") {
                return res.status(400).json({
                    success: false,
                    message: "Payment already completed"
                })
            }

            if (!issue.total_amount || issue.total_amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "No payable amount found"
                })
            }

            issue.payment_status = "paid"
            issue.payment_date = new Date()

            await issue.save()

            return res.status(200).json({
                success: true,
                message: "Library payment collected successfully",
                data: {
                    issueId: issue._id,
                    paid_amount: issue.total_amount,
                    payment_date: issue.payment_date,
                    payment_status: issue.payment_status
                }
            })

        } catch (error) {
            console.error("asasasas", error)
            return res.status(500).json({
                success: false,
                message: "Failed to collect payment"
            })
        }
    }


}

module.exports = new IssueController()