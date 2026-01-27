import React from "react";

const data = [
  {
    id: "2",
    name: "Students",
    title: "Total Students",
  },
  {
    id: "3",
    name: "Courses",
    title: "Total Courses",
  },
];

type Data = {
  student: number,
  Courses: number
};


function InstutionDataCart({student,Courses}: Data) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
      <div
          
          className="
            bg-[var(--color-surface)]
            border border-[var(--color-border)]
            rounded-xl
            p-6
            transition-all
            hover:shadow-lg
          "
        >
          {/* Title */}
          <p className="text-sm text-[var(--color-text-secondary)]">
            Students
          </p>

          {/* Value */}
          <h2 className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">
           {student}
          </h2>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">
              Total Courses
            </span>

            <span
              className="
                px-3 py-1 text-xs font-medium
                rounded-full
                bg-[var(--color-primary)]
                text-white
              "
            >
              Active
            </span>
          </div>
        </div>


        <div
         
          className="
            bg-[var(--color-surface)]
            border border-[var(--color-border)]
            rounded-xl
            p-6
            transition-all
            hover:shadow-lg
          "
        >
          {/* Title */}
          <p className="text-sm text-[var(--color-text-secondary)]">
            Courses
          </p>

          {/* Value */}
          <h2 className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">
           {Courses}
          </h2>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">
             Total Courses
            </span>

            <span
              className="
                px-3 py-1 text-xs font-medium
                rounded-full
                bg-[var(--color-primary)]
                text-white
              "
            >
              Active
            </span>
          </div>
        </div>
    </div>
  );
}

export default InstutionDataCart;
