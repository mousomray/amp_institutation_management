const express = require('express'); // Import For Express
const dotenv = require('dotenv'); // For .env file 
const cors = require('cors'); // For to run different server when I run use React with node 
const connectDB = require('./app/config/db.js'); // Connect Database
const cookieParser = require('cookie-parser')

dotenv.config(); // .env with config
const app = express();
connectDB()


app.use(express.json()); // use Express
app.use(cors(
    {
        origin : [process.env.FRONTEND_URL],
        methods: ["GET", "POST", "PUT", "PUTCH", "DELETE"],
        credentials: true
    }
)) 
app.use(cookieParser())
app.use('/uploads', express.static(__dirname + '/uploads'));

// Auth router
const AuthRouter = require('./app/router/auth.routes.js');
app.use('/admin', AuthRouter);

// Student Router
const StudentRouter = require('./app/router/student.routes.js');
app.use('/student', StudentRouter);

// Student Router
const BookRouter = require('./app/router/book.routes.js');
app.use('/book', BookRouter);

// Student Router
const IssueRouter = require('./app/router/issue.routes.js');
app.use('/api', IssueRouter);

// Student Router
const SettingRouter = require('./app/router/setting.routes.js');
app.use('/api', SettingRouter);

const port = 3004
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});