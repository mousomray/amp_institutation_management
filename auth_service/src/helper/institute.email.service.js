const nodemailer = require("nodemailer");
const { Institution, User } = require("../model/model");

const createTransporter = async (userId) => {

    if (!userId) {
        throw new Error("User ID is required");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    if (!user.institution) {
        throw new Error("Institution ID not linked with user");
    }

    const institution = await Institution
        .findById(user.institution)
        .select("+appPassword");

    console.log("Institution details for email transporter:", institution);

    if (!institution) {
        throw new Error("Institution not found");
    }

    if (!institution.appPassword) {
        throw new Error("Email configuration not set");
    }

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: institution.email,
            pass: institution.appPassword,
        },
    });

    return transporter;
};

module.exports = createTransporter;
