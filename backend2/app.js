const express = require('express'); 
const dotenv = require('dotenv');  
const cors = require('cors');  
const connectDB = require('./app/config/db.js'); // Connect Database
const cookieParser = require('cookie-parser')
const path = require('path');

dotenv.config(); // .env with config
const app = express();
connectDB()


app.use(express.json()); // use Express
app.use(cors({
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
}));
app.use(cookieParser())
app.use('/uploads', express.static(__dirname + '/uploads'));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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

const port = process.env.PORT || 3004;
const env = process.env.NODE_ENV || 'development';
app.listen(port, () => {
    console.log(`Server is running on port ${port} (env: ${env})`);
});