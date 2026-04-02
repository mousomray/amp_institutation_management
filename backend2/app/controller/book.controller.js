const BookModel = require('../model/book');
const uploadSingleImage = require("../helper/upload.js")

class BookController {

    // Create Book Data 
    async create(req, res) {
        try {
            // Image Path Validation
            // if (!req.file) {
            //     return res.status(400).json({
            //         message: "Validation error",
            //         errors: ["Book image is required"]
            //     });
            // }
            console.log("Requested userId:", req.user.id);
            const imageUrl = await uploadSingleImage(req.file);
            const bookdata = new BookModel({ ...req.body, userId: req.user.id, image: imageUrl });
            const data = await bookdata.save();
            res.status(201).json({ message: "Book added successfully in Library", data });
        } catch (error) {
            const statusCode = error.name === 'ValidationError' ? 400 : 500;
            const message = error.name === 'ValidationError'
                ? { message: "Validation error", errors: Object.values(error.errors).map(err => err.message) }
                : { message: "An unexpected error occurred" };

            console.error(error);
            res.status(statusCode).json(message);
        }
    }

    // Get Book List
    async getall(req, res) {
        try {
            const userId = req.user.id;
            const data = await BookModel.find({ isDeleted: false, userId: userId });
            res.status(200).json({
                message: "All Books are Fetched successfully",
                total: data.length,
                books: data
            })
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Error retrieving book data" });
        }
    }

    // Get Single Book 
    async getsingle(req, res) {
        const id = req.params.id;
        try {
            const data = await BookModel.findById(id);
            res.status(200).json({ message: "Single data fetched", data });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Error retrieving Book data" });
        }
    }

    // Update Student
    async bookupdate(req, res) {
        const id = req.params.id;
        try {
            const updatedbook = await BookModel.findByIdAndUpdate(id, { ...req.body, userId: req.user.id }, { new: true, runValidators: true }
            );
            if (req.file) {
                const imageUrl = await uploadSingleImage(req.file);
                updatedbook.image = imageUrl;
                await updatedbook.save();
            }
            if (!updatedbook) {
                return res.status(404).json({ message: "Book not found" });
            }
            res.status(200).json({ message: "Book updated successfully", data: updatedbook });
        } catch (error) {
            const statusCode = error.name === 'ValidationError' ? 400 : 500;
            const message = error.name === 'ValidationError'
                ? { message: "Validation error", errors: Object.values(error.errors).map(err => err.message) }
                : { message: "Error updating Book data" };

            console.error(error);
            res.status(statusCode).json(message);
        }
    }

    // Delete Student
    async bookdelete(req, res) {
        const id = req.params.id;
        try {
            const book = await BookModel.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { isDeleted: true },
                { new: true }
            );
            if (!book) {
                return res.status(404).json({ message: "Book not found or already deleted" });
            }
            // const activeIssue = await Issue.findOne({
            //     student_id: id,
            //     status: "issued"
            // });

            // if (activeIssue) {
            //     return res.status(400).json({
            //         message: "Student has active issued books, cannot delete"
            //     });
            // }
            res.status(200).json({ message: "Book deleted successfully (soft delete)" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error deleting book" });
        }
    }


}
module.exports = new BookController()