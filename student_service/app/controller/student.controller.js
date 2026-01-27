const StudentModel = require('../model/student');

class StudentController {

    // Create Student Data 
    async create(req, res) {
        try {
            const studentdata = new StudentModel(req.body);
            const data = await studentdata.save();
            res.status(201).json({ message: "Student added successfully", data });
        } catch (error) {
            const statusCode = error.name === 'ValidationError' ? 400 : 500;
            const message = error.name === 'ValidationError'
                ? { message: "Validation error", errors: Object.values(error.errors).map(err => err.message) }
                : { message: "An unexpected error occurred" };

            console.error(error);
            res.status(statusCode).json(message);
        }
    }

    // Get Student List
    async getall(req, res) {
        try {
            const data = await StudentModel.find({ isDeleted: false })
            res.status(200).json({
                message: "Student get successfully",
                total: data.length,
                students: data
            })
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Error retrieving student data" });
        }
    }

    // Get Single Student 
    async getsingle(req, res) {
        const id = req.params.id;
        try {
            const data = await StudentModel.findById(id);
            res.status(200).json({ message: "Single data fetched", data });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Error retrieving Student data" });
        }
    }

    // Update Student
    async studentupdate(req, res) {
        const id = req.params.id;
        try {
            const updatedstudent = await StudentModel.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }
            );
            if (!updatedstudent) {
                return res.status(404).json({ message: "Student not found" });
            }
            res.status(200).json({ message: "Student updated successfully", data: updatedstudent });
        } catch (error) {
            const statusCode = error.name === 'ValidationError' ? 400 : 500;
            const message = error.name === 'ValidationError'
                ? { message: "Validation error", errors: Object.values(error.errors).map(err => err.message) }
                : { message: "Error updating Student data" };

            console.error(error);
            res.status(statusCode).json(message);
        }
    }

    // Delete Student
    async studentdelete(req, res) {
        const id = req.params.id;
        try {
            const student = await StudentModel.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { isDeleted: true },
                { new: true }
            );
            if (!student) {
                return res.status(404).json({ message: "Student not found or already deleted" });
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
            res.status(200).json({ message: "Student deleted successfully (soft delete)" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error deleting student" });
        }
    }


}
module.exports = new StudentController()