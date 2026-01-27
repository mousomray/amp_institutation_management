import axios from 'axios'

const microInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_LIBRARY_API,
  timeout: 10000,
  withCredentials: true
})



export default microInstance
