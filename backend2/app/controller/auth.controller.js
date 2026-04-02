const AdminModel = require('../model/admin') // Our admin Model
const { comparePassword } = require('../middleware/Auth') // Came from middleware folder
const jwt = require('jsonwebtoken'); // For to add token in header
const bcrypt = require('bcryptjs'); // For hashing password

class AuthController {

    // Handle Register
    async register(req, res) {
        try {
            // Find email from database 
            const existingAdmin = await AdminModel.findOne({ email: req.body.email });
            // Same email not accpected
            if (existingAdmin) {
                return res.status(400).json({
                    message: "Validation error",
                    errors: ["User already exists with this email"]
                });
            }
            // Password Validation
            if (!req.body.password) {
                return res.status(400).json({
                    message: "Validation error",
                    errors: ["Password is required"]
                });
            }
            if (req.body.password.length < 8) {
                return res.status(400).json({
                    message: "Validation error",
                    errors: ["Password should be at least 8 characters long"]
                });
            }
            // Image Path Validation
            if (!req.file) {
                return res.status(400).json({
                    message: "Validation error",
                    errors: ["Profile image is required"]
                });
            }
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);
            const admin = new AdminModel({
                ...req.body, password: hashedPassword, image: req.file.path,roles:"admin"
            });
            const savedAdmin = await admin.save();
            res.status(201).json({
                sucess: true,
                message: "Registration successfully",
                admin: savedAdmin
            })
        } catch (error) {
            const statusCode = error.name === 'ValidationError' ? 400 : 500;
            const message = error.name === 'ValidationError'
                ? { message: "Validation error", errors: Object.values(error.errors).map(err => err.message) }
                : { message: "An unexpected error occurred" }; // Other Field validation
            console.error(error);
            res.status(statusCode).json(message);
        }
    }

    // Handle Login
    async login(req, res) {
        try {
            const { email, password } = req.body
            if (!email || !password) {
                return res.status(400).json({
                    message: "All fields are required"
                })
            }
            const admin = await AdminModel.findOne({ email })
            if (!admin) {
                return res.status(400).json({
                    message: "Admin not found"
                })
            }
            const isMatch = comparePassword(password, admin.password)
            if (!isMatch) {
                return res.status(400).json({
                    message: "Invalid credentials"
                })
            }
            const token = jwt.sign({
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                image: admin.image
            }, process.env.API_KEY,
                { expiresIn: "1d" })
            res.status(200).json({
                sucess: true,
                message: "Admin login successfully",
                data: {
                    _id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    image: admin.image
                },
                token: token
            })
        } catch (error) {
            console.log(error);

        }

    }

    // Fetching Dashboard Data 
    async dashboard(req, res) {
        try {
            const admin = req.user;
            if (!admin) {
                return res.status(401).json({ message: "Unauthorized access. No admin information found." });
            }
            console.log("User Data:", user);
            res.status(200).json({
                message: "Welcome to the admin dashboard",
                user: user
            });
        } catch (error) {
            console.error("Server Error:", error.message);
            res.status(500).json({ message: "Server error" });
        }
    };

}
module.exports = new AuthController()