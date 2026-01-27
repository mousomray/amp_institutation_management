"use client";

import React, { useEffect, useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { toast } from "react-toastify";
import { formatDate } from "@/helper/DateTime";
import { useParams, useRouter } from "next/navigation";

export default function StudentDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("institution-token")
      : null;

  /* ================= FETCH STUDENT ================= */
  useEffect(() => {
    if (id && token) fetchStudent();
  }, [id, token]);

  const fetchStudent = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get(
        `/institution/student-detail/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setStudent(res.data.student);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to load student");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || !student) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading student details...
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ================= LEFT PROFILE ================= */}
      <Card className="shadow-lg">
        <div className="flex flex-col items-center text-center gap-3">
          <img
            src={student.photo}
            alt={student.name}
            className="w-32 h-32 rounded-full object-cover border"
          />

          <h2 className="text-xl font-semibold">{student.name}</h2>
          <p className="text-sm text-gray-500">{student.email}</p>

          <Divider />

          <div className="w-full text-left text-sm space-y-2">
            <p>
              <span className="font-semibold">Student ID:</span>{" "}
              {student.studentId}
            </p>
            <p>
              <span className="font-semibold">Phone:</span> {student.phone}
            </p>
            <p>
              <span className="font-semibold">Role:</span> {student.role}
            </p>
            <p>
              <span className="font-semibold">Total Courses:</span>{" "}
              {student.totalCourses}
            </p>
          </div>
        </div>
      </Card>

      {/* ================= RIGHT DETAILS ================= */}
      <Card className="lg:col-span-2 shadow-lg">
        {/* PERSONAL INFO */}
        <h3 className="text-lg font-semibold mb-3">Personal Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Info label="Father Name" value={student.fatherName} />
          <Info label="Blood Group" value={student.bloodGroup} />
          <Info label="Date of Birth" value={formatDate(student.dob)} />
          <Info
            label="Admission Date"
            value={formatDate(student.admissionDate)}
          />
        </div>

        <Divider />

        {/* LOGIN INFO */}
        <h3 className="text-lg font-semibold mb-3">Login Credentials</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Info label="Email" value={student.email} />
          <Info label="Password" value={student.userPassword} highlight />
        </div>

        <Divider />

        {/* COURSES */}
        <h3 className="text-lg font-semibold mb-3">
          Courses Enrolled ({student.courses.length})
        </h3>

        {student.courses.length === 0 ? (
          <p className="text-sm text-gray-500">
            No courses assigned to this student.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {student.courses.map((course: any) => (
              <Card key={course._id} className="shadow-sm">
                <div className="flex gap-3">
                  {course.image && (
                    <img
                      src={course.image}
                      alt={course.name}
                      className="w-16 h-16 rounded object-cover border"
                    />
                  )}

                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{course.name}</h4>
                    <p className="text-xs text-gray-500">
                      Duration: {course.duration}
                    </p>
                    <p className="text-xs text-gray-500">
                      Fee: ₹{course.fee}
                    </p>

                    {course.description && (
                      <p className="text-xs mt-1 text-gray-600 line-clamp-2">
                        {course.description}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Divider />

        {/* SIGNATURE */}
        <h3 className="text-lg font-semibold mb-3">Signature</h3>
        <img
          src={student.signature}
          alt="Signature"
          className="h-20 object-contain border p-2 rounded"
        />

        <Divider />

        {/* ACTIONS */}
        <div className="flex gap-3 justify-end">
          <Button
            label="Back"
            icon="pi pi-arrow-left"
            outlined
            onClick={() => router.back()}
          />
        </div>
      </Card>
    </div>
  );
}

/* ================= INFO COMPONENT ================= */
function Info({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p
        className={`font-medium ${
          highlight ? "text-red-600" : "text-gray-900"
        }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}
