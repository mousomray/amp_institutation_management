
const axios = require("axios");

const sendMessage = async ({institutionNumber, studentNumber,data}) => {
  await axios.post(
    `https://graph.facebook.com/v19.0/${institutionNumber}/messages`,
    {
      messaging_product: "whatsapp",
      to: studentNumber,
      type: "text",
      text: {
        body: data
      }
    },
    {
      headers: {
        Authorization: "Bearer YOUR_ACCESS_TOKEN",
        "Content-Type": "application/json"
      }
    }
  );
};

