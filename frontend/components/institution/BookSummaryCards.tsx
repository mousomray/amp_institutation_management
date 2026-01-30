import React from "react";

export type SummaryType = {
  totalBooks: number;
  availableBooks: number;
  issuedBooks: number;
  todayIssued: number;
  todayReturned: number;
  totalFineCollected: number;
};

type BookSummaryCardsProps = {
  summary: SummaryType;
};

export default function BookSummaryCards({ summary }: BookSummaryCardsProps) {
  const cards = [
    {
      title: "Total Books",
      value: summary.totalBooks,
      icon: "pi pi-book",
      bgColor: "bg-blue-500",
    },
    {
      title: "Available Books",
      value: summary.availableBooks,
      icon: "pi pi-check-circle",
      bgColor: "bg-green-500",
    },
    {
      title: "Issued Books",
      value: summary.issuedBooks,
      icon: "pi pi-shopping-cart",
      bgColor: "bg-orange-500",
    },
    {
      title: "Today Issued",
      value: summary.todayIssued,
      icon: "pi pi-calendar-plus",
      bgColor: "bg-purple-500",
    },
    {
      title: "Today Returned",
      value: summary.todayReturned,
      icon: "pi pi-undo",
      bgColor: "bg-teal-500",
    },
    {
      title: "Total Fine Collected",
      value: `₹${summary.totalFineCollected.toFixed(2)}`,
      icon: "pi pi-wallet",
      bgColor: "bg-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-md p-4 hover:shadow-xl transition-all duration-300 border border-gray-100"
        >
          {/* Icon at top */}
          <div className="flex justify-start mb-4">
            <div className={`w-14 h-14 ${card.bgColor} rounded-xl flex items-center justify-center shadow-lg`}>
              <i className={`${card.icon} text-2xl text-white`}></i>
            </div>
          </div>
          
          {/* Value */}
          <h3 className="text-3xl font-bold text-gray-800 mb-1">{card.value}</h3>
          
          {/* Title */}
          <p className="text-sm text-gray-500 font-medium">{card.title}</p>
        </div>
      ))}
    </div>
  );
}
