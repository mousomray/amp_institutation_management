const nodemailer = require("nodemailer");
const axios = require("axios");

const createTransporter = async (userId) => {

    try {
        const response = await axios.get(
            `${process.env.STUDENT_SERVICE_URL}/api/institution/mail-config/${userId}`
        );

        // console.log("Email Config Response:", response);

        const { email, appPassword } = response.data;

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: email,
                pass: appPassword,
            },
        });
        return transporter;
    } catch (error) {
        console.error("Error fetching email configuration:", error);
    }
};

module.exports = createTransporter;