'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'

import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Card } from 'primereact/card'
import { Tag } from 'primereact/tag'
import axiosInstance from '@/service/axios.service'
import { toast , ToastContainer } from "react-toastify";
type Student = {
  _id: string
  studentId: string
  name: string
  email: string
  phone: string
}

type Course = {
  _id: string
  name: string
  duration: string
  fee: number
  description: string
  totalStudents: number
  students: Student[]
}

export default function page() {
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!courseId) return

    const fetchCourse = async () => {
      try {
        const res = await axiosInstance.get(
          `/institution/course-detail/${courseId}`
        )
        setCourse(res.data.data)
      } catch (error) {
        if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to load students");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    
      }
    }

    fetchCourse()
  }, [courseId])

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  if (!course) {
    return <div className="p-6 text-red-500">Course not found</div>
  }

  return (
    <div className="p-6 space-y-6">

     
      <Card title="Course Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

          <div>
            <p className="text-gray-500">Course Name</p>
            <p className="font-semibold">{course.name}</p>
          </div>

          <div>
            <p className="text-gray-500">Duration</p>
            <p className="font-semibold">{course.duration}</p>
          </div>

          <div>
            <p className="text-gray-500">Fee</p>
            <p className="font-semibold">₹ {course.fee}</p>
          </div>

          <div>
            <p className="text-gray-500">Total Students</p>
            <Tag value={course.totalStudents} severity="info" />
          </div>

          <div className="md:col-span-2">
            <p className="text-gray-500">Description</p>
            <p className="font-medium">{course.description}</p>
          </div>

        </div>
      </Card>

      {/* ================= STUDENT TABLE ================= */}
      <Card title="Enrolled Students">
        <DataTable
          value={course.students}
          paginator
          rows={5}
          emptyMessage="No students enrolled"
          responsiveLayout="scroll"
        >
          <Column field="studentId" header="Student ID" />
          <Column field="name" header="Name" />
          <Column field="email" header="Email" />
          <Column field="phone" header="Phone" />
        </DataTable>
      </Card>
  <ToastContainer/>
    </div>
  )
}
