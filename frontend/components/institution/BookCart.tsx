"use client";

import React from "react";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Book = {
    _id: string;
    image: string;
    name: string;
    authorName: string;
    description: string;
    language: string;
    isAvailable: boolean;
    isDeleted: boolean;
    book_fee?: number;
    late_fine?: number;
};

type BookCardProps = {
    books: Book[];
    onEdit?: (book: Book) => void;
    onDelete?: (id: string) => void;
};

function formatCurrency(value?: number) {
    if (value === undefined || value === null) return "—";
    return `₹${Number(value).toLocaleString("en-IN")}`;
}

function BookCard({ books, onEdit, onDelete }: BookCardProps) {
    const router = useRouter();

    const baseApi = (process.env.NEXT_PUBLIC_LIBRARY_API || "").replace(/\/$/, "");

    const resolveImageSrc = (raw?: string) => {
        if (!raw) return "";
        let cleaned = raw.replace(/\\/g, "/").trim();
        if (/^https?:\/\//i.test(cleaned)) return cleaned;
        cleaned = cleaned.replace(/^\/+/, "");
        return baseApi ? `${baseApi}/${cleaned}` : `/${cleaned}`;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 px-6 py-8 w-full">
            {books.map((book) => {
                const imageSrc = resolveImageSrc(book.image);

                return (
                    <article
                        key={book._id}
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/institution/dashboard/book/${book._id}`);
                        }}
                        className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
                    >
                        {/* Image */}
                        <div className="relative h-56 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                            {imageSrc ? (
                                <Image
                                    src={imageSrc}
                                    alt={book.name || "Book cover"}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            ) : (
                                <div className="text-gray-300 text-4xl">📚</div>
                            )}

                            {/* Action buttons */}
                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit?.(book);
                                    }}
                                    className="bg-white/95 p-2 rounded-full shadow hover:bg-blue-600 hover:text-white transition"
                                    aria-label="Edit book"
                                >
                                    <Pencil size={18} />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete?.(book._id);
                                    }}
                                    className="bg-white/95 p-2 rounded-full shadow hover:bg-red-600 hover:text-white transition"
                                    aria-label="Delete book"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-5 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                                        {book.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        {book.authorName}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <span
                                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                                            book.isAvailable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                                        }`}
                                    >
                                        {book.isAvailable ? "Available" : "Unavailable"}
                                    </span>
                                    {book.language && (
                                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                                            {book.language}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-gray-700 line-clamp-3">{book.description}</p>

                            {/* Fees */}
                            <div className="mt-2 grid grid-cols-2 gap-3 items-center">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500">Book Fee</p>
                                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(book.book_fee)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500">Late Fine</p>
                                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(book.late_fine)}</p>
                                </div>
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

export default BookCard;
