"use client";

import React from "react";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";


type Course = {
  _id: string;
  image: string;
  name: string;
  description: string;
  duration: string;
  fee: number | string;
};

type CourseCardProps = {
  courses: Course[];
  onEdit?: (course: Course) => void;
  onDelete?: (id: string) => void;
};


function CourseCard({ courses, onEdit, onDelete }: CourseCardProps) {
  const router = useRouter()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 px-10 py-10 w-full">
      {courses.map((course) => (
        <div
          key={course._id}
          onClick={(e) => {
            e.stopPropagation();
             router.push(`/institution/dashboard/course/${course._id}`);
          }
          }
          className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 w-full max-w-sm mx-auto"
        >
          {/* IMAGE */}
          <div className="relative h-64 w-full overflow-hidden">
            <Image
              src={course.image}
              alt={course.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* GRADIENT */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

            {/* ACTION BUTTONS */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
              {/* EDIT */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(course);
                }}
                className="bg-white/90 p-3 rounded-full shadow hover:bg-blue-600 hover:text-white transition"
              >
                <Pencil size={20} />
              </button>

              {/* DELETE */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(course._id); // ✅ FIX
                }}
                className="bg-white/90 p-3 rounded-full shadow hover:bg-red-600 hover:text-white transition"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {/* DURATION BADGE */}
            <span className="absolute top-4 left-4 bg-white/90 text-gray-900 text-sm font-semibold px-4 py-2 rounded-full shadow">
              {course.duration}
            </span>
          </div>

          {/* DETAILS */}
          <div className="p-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {course.name}
            </h3>

            <p className="text-sm text-gray-600 line-clamp-3">
              {course.description}
            </p>

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-gray-500">Course Fee</span>
              <span className="text-primary text-xl font-bold">
                ₹{course.fee}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CourseCard;
