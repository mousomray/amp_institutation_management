const express = require("express")
const dotenv = require("dotenv")
const path = require("path");
const cors = require("cors")
const Conect = require("./src/db/Connent.js")
const cookieParser = require('cookie-parser')

dotenv.config()

const app = express()
 Conect()

app.use(cors(
    {
        origin : [process.env.FRONTEND_URL],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        credentials: true
    }
))
app.use(cookieParser())

app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); 

const adminRoutes = require ("./src/routes/admin.routes.js")
const institutionRoutes = require("./src/routes/institution.routes.js")
const studentRoutes = require("./src/routes/student.routes.js")

// Course Routes 
const courseRoutes = require("./src/routes/course.routes.js") 

// Student Course Enroll Routes
const studentCourseRoutes = require("./src/routes/studentCourse.routes.js")

// Fees Master Routes
const feesMasterRoutes = require("./src/routes/feesmaster.routes.js")

// Receipt Routes
const receiptRoutes = require("./src/routes/recipt.routes.js")

// Student Fees Ledger Routes
const studentFeesLedgerRoutes = require("./src/routes/studentfeesledger.routes.js")

// Student Other Payment Routes
const otherPaymentRoutes = require("./src/routes/OtherPayment.routes.js")

// Course Fees Routes
const courseFeesRoutes = require("./src/routes/courseFees.routes.js")

app.use("/api/admin", adminRoutes)
app.use("/api/institution",institutionRoutes)

// New requirement routes
app.use("/api/student",studentRoutes)
app.use("/api/institution", courseRoutes)
app.use("/api/student-course", studentCourseRoutes)
app.use("/api/fees-master", feesMasterRoutes)
app.use("/api/receipt", receiptRoutes)
app.use("/api/student-fees-ledger", studentFeesLedgerRoutes)
app.use("/api/other-payment", otherPaymentRoutes)
app.use("/api/course-fees", courseFeesRoutes)
const port = process.env.PORT

app.listen(port,() => {
    console.log(`server is runing ${port}`)
})