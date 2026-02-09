const { ZodError } = require("zod");
const mongoose = require("mongoose");
const FeesMasterModel = require("../model/feesmaster.model.js");
const FeesMasterSchema = require("../schema/FeesMaster.schema.js");

const addFeesMaster = async (req, res) => {
  try {
    const userId = req.user.id;

    const payload = FeesMasterSchema.parse({
      ...req.body,
      userId,
    });

    // Duplicate check (same user, same name, not deleted)
    const exists = await FeesMasterModel.findOne({
      name: payload.name,
      userId,
      isDeleted: false,
    });

    if (exists) {
      return res.status(400).json({
        message: "Fees head already exists",
      });
    }

    const feesMaster = await FeesMasterModel.create(payload);

    res.status(201).json({
      message: "Fees master created successfully",
      data: feesMaster,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map(err => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


const getAllFeesMaster = async (req, res) => {
  try {
    const userId = req.user.id;

    const data = await FeesMasterModel.find({
      userId,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      total: data.length,
      data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


const getSingleFeesMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const data = await FeesMasterModel.findOne({
      _id: id,
      userId,
      isDeleted: false,
    });

    if (!data) {
      return res.status(404).json({ message: "Fees master not found" });
    }

    res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


const updateFeesMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    //console.log("|=>", userId)
     const payload = FeesMasterSchema.parse({
      ...req.body,
      userId,
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const data = await FeesMasterModel.findOneAndUpdate(
      {
        _id: id,
        userId,
        isDeleted: false,
      },
      {
        name: payload.name,
        isActive: payload.isActive
      },
      { new: true }
    );

    if (!data) {
      return res.status(404).json({ message: "Fees master not found" });
    }

    res.status(200).json({
      message: "Fees master updated successfully",
      data,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map(err => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


const toggleFeesMasterStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const data = await FeesMasterModel.findOne({
      _id: id,
      userId,
      isDeleted: false,
    });

    if (!data) {
      return res.status(404).json({ message: "Fees master not found" });
    }

    data.isActive = !data.isActive;
    await data.save();

    res.status(200).json({
      message: `Fees master ${data.isActive ? "activated" : "deactivated"
        } successfully`,
      data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


const deleteFeesMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const data = await FeesMasterModel.findOneAndUpdate(
      {
        _id: id,
        userId,
        isDeleted: false,
      },
      {
        isDeleted: true,
      },
      { new: true }
    );

    if (!data) {
      return res.status(404).json({ message: "Fees master not found" });
    }

    res.status(200).json({
      message: "Fees master deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = {
  addFeesMaster,
  getAllFeesMaster,
  getSingleFeesMaster,
  updateFeesMaster,
  toggleFeesMasterStatus,
  deleteFeesMaster,
};
