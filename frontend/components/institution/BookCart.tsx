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
};

type BookCardProps = {
    books: Book[];
    onEdit?: (book: Book) => void;
    onDelete?: (id: string) => void;
};


function BookCard({ books, onEdit, onDelete }: BookCardProps) {
    console.log("Books in BookCard:", books);
    const router = useRouter()

    const baseApi = (process.env.NEXT_PUBLIC_LIBRARY_API || "").replace(/\/$/, "");

    const resolveImageSrc = (raw?: string) => {
        if (!raw) return "";
        // replace backslashes with forward slashes (fix Windows paths)
        let cleaned = raw.replace(/\\/g, "/").trim();
        // if already an absolute url, return as-is
        if (/^https?:\/\//i.test(cleaned)) return cleaned;
        // remove any leading slashes to avoid double slashes
        cleaned = cleaned.replace(/^\/+/, "");
        return baseApi ? `${baseApi}/${cleaned}` : `/${cleaned}`;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 px-10 py-10 w-full">
            {books.map((book) => {
                const imageSrc = resolveImageSrc(book.image);
                let useImgTag = false;
                try {
                    const host = new URL(imageSrc, typeof window !== "undefined" ? window.location.origin : "http://localhost").hostname;
                    if (host === "localhost" || host === "127.0.0.1") useImgTag = true;
                } catch {
                    useImgTag = true;
                }

                return (
                    <div
                        key={book._id}
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/institution/dashboard/book/${book._id}`);
                        }}
                        className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 w-full max-w-sm mx-auto"
                    >
                        {/* IMAGE */}
                        <div className="relative h-64 w-full overflow-hidden">
                            {useImgTag ? (
                                // plain img for localhost or unconfigured hosts
                                // keep classes to match next/image fill + object-cover behaviour
                                <img
                                    src={imageSrc}
                                    alt={book.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            ) : (
                                <Image
                                    src={imageSrc}
                                    alt={book.name}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            )}

                            {/* GRADIENT */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                            {/* ACTION BUTTONS */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                {/* EDIT */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit?.(book);
                                    }}
                                    className="bg-white/90 p-3 rounded-full shadow hover:bg-blue-600 hover:text-white transition"
                                >
                                    <Pencil size={20} />
                                </button>

                                {/* DELETE */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete?.(book._id);
                                    }}
                                    className="bg-white/90 p-3 rounded-full shadow hover:bg-red-600 hover:text-white transition"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>

                        {/* DETAILS */}
                        <div className="p-6 space-y-3">
                            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                                {book.name}
                            </h3>

                            <p className="text-sm text-gray-600 line-clamp-3">
                                {book.description}
                            </p>

                            <div className="flex items-center justify-between pt-2">
                                <span className="text-sm text-gray-500">Course Fee</span>
                                <span className="text-primary text-xl font-bold">
                                    ₹{book.authorName}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default BookCard;
