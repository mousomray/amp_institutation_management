const axios = require('axios')

const STUDENT_SERVICE_URL = process.env.STUDENT_SERVICE_URL
// example: http://localhost:3001

async function getStudentFromStudentService(studentId, req) {
  try {
    const response = await axios.get(
      `${STUDENT_SERVICE_URL}/api/student/onlyonestudentapi/${studentId}`,
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    )
    return response.data.data
  } catch (error) {
    console.error('Student service error:', error)
    return null
  }
}

module.exports = { getStudentFromStudentService }
