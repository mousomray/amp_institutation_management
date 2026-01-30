import React from "react";

type Data = {
  student: number,
  Courses: number
};

function InstutionDataCart({student, Courses}: Data) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
      {/* Students Card */}
      <div
        className="
          bg-white
          border border-gray-100
          rounded-xl
          shadow-md
          p-6
          transition-all
          hover:shadow-xl
          duration-300
        "
      >
        {/* Icon */}
        <div className="flex justify-start mb-4">
          <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <i className="pi pi-users text-2xl text-white"></i>
          </div>
        </div>

        {/* Value */}
        <h2 className="text-4xl font-bold text-gray-800 mb-2">
          {student}
        </h2>

        {/* Title */}
        <p className="text-sm text-gray-500 font-medium mb-4">
          Students
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-600 font-medium">
            Total Students
          </span>

          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500 text-white shadow-sm">
            Active
          </span>
        </div>
      </div>

      {/* Courses Card */}
      <div
        className="
          bg-white
          border border-gray-100
          rounded-xl
          shadow-md
          p-6
          transition-all
          hover:shadow-xl
          duration-300
        "
      >
        {/* Icon */}
        <div className="flex justify-start mb-4">
          <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
            <i className="pi pi-book text-2xl text-white"></i>
          </div>
        </div>

        {/* Value */}
        <h2 className="text-4xl font-bold text-gray-800 mb-2">
          {Courses}
        </h2>

        {/* Title */}
        <p className="text-sm text-gray-500 font-medium mb-4">
          Courses
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-600 font-medium">
            Total Courses
          </span>

          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500 text-white shadow-sm">
            Active
          </span>
        </div>
      </div>
    </div>
  );
}

export default InstutionDataCart;
