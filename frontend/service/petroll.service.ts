import axios from 'axios'

const petrollInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_PETROLL_PAMP_API_URL,
  // timeout: 10000,
  withCredentials: true
})



export default petrollInstance
