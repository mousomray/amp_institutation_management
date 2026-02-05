"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { MultiSelect } from "primereact/multiselect";
import { Button } from "primereact/button";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";

type CourseEnrollProps = {
    courseName: string;
    courseImage: string;
    courseDuration: string;
    courseFee: number | string;
    courseId: string | null;
    token: string;
};

function CourseEnroll({
    courseName,
    courseImage,
    courseDuration,
    courseFee,
    courseId,
    token,
}: CourseEnrollProps) {
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    /* ================= FETCH STUDENTS ================= */
    const fetchStudents = async () => {
        try {
            const res = await axiosInstance.get("/institution/all-students");
            setStudents(res.data.data || []);
        } catch {
            toast.error("Failed to load students");
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    /* ================= ENROLL ================= */
    const handleEnroll = async () => {
        if (!selectedStudents.length) {
            toast.error("Please select at least one student");
            return;
        }

        try {
            setLoading(true);
            if (courseId !== null) {
               const res =  await axiosInstance.post(`/institution/courses/${courseId}/enroll-students`, {
                    studentIds: selectedStudents.map((s) => s._id),
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    withCredentials: true,
                });

                toast.success(res.data.message);
                setSelectedStudents([]);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Enrollment failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* COURSE INFO */}
            <div className="flex gap-4 items-center">
                <Image
                    src={courseImage}
                    alt={courseName}
                    width={80}
                    height={80}
                    className="rounded-xl object-cover"
                />

                <div>
                    <h3 className="text-lg font-semibold">{courseName}</h3>
                    <p className="text-sm text-gray-500">
                        Duration: {courseDuration}
                    </p>
                    <p className="text-primary font-bold text-lg">
                        ₹{courseFee}
                    </p>
                </div>
            </div>

            {/* STUDENTS */}
            <div>
                <label className="text-sm font-medium">Students</label>
                <MultiSelect
                    value={selectedStudents}
                    options={students}
                    selectionLimit={1}
                    optionLabel="name"
                    display="chip"
                    placeholder="Select students"
                    className="w-full mt-1"
                    filter
                    filterBy="name,email,studentId"
                    filterPlaceholder="Search students..."
                    emptyFilterMessage="No students found"
                    onChange={(e) => setSelectedStudents(e.value)}
                    panelStyle={{ maxHeight: "300px" }}
                    itemTemplate={(student) => (
                        <div className="flex flex-col">
                            <span className="font-medium">{student.name}</span>
                            <span className="text-xs text-gray-500">{student.email}</span>
                        </div>
                    )}
                />
            </div>

            {/* ACTION */}
            <Button
                label={loading ? "Enrolling..." : "Enroll Students"}
                className="w-full"
                loading={loading}
                onClick={handleEnroll}
            />
            <ToastContainer/>
        </div>
    );
}

export default CourseEnroll;
