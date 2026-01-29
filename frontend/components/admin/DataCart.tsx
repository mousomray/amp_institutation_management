import React from "react";

const data = [
  {
    id: "1",
    name: "Institute",
    value: "50",
    title: "Total Institutes",
  },
  {
    id: "2",
    name: "Students",
    value: "10,000",
    title: "Total Students",
  },
  {
    id: "3",
    name: "Courses",
    value: "150",
    title: "Total Courses",
  },
];

type StatsProps = {
  totalInstitutions: number;
};

function DataCart({ totalInstitutions }: StatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

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
          Institute
        </p>

        {/* Value */}
        <h2 className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">
          {totalInstitutions}
        </h2>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-secondary)]">
            Total Institutes
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

export default DataCart;
