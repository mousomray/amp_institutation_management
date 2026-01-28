'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { Card } from 'primereact/card'
import { Tag } from 'primereact/tag'
import microInstance from '@/service/micro.service'
import { toast , ToastContainer } from "react-toastify";

type Book = {
  _id: string
  name: string
  authorName: string
  language: string
  image?: string
  description?: string
  isAvailable?: boolean
  isDeleted?: boolean
  createdAt?: string
  updatedAt?: string
}

export default function page() {
  const params = useParams()
  const bookId = params.id as string

  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookId) return

    const fetchBook = async () => {
      try {
        const res = await microInstance.get(`/book/singlebook/${bookId}`)
        setBook(res.data.data)
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(error.response?.data?.message || "Failed to load book")
        } else {
          toast.error("Unexpected error occurred")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchBook()
  }, [bookId])

  if (loading) return <div className="p-6">Loading...</div>
  if (!book) return <div className="p-6 text-red-500">Book not found</div>

  const imageUrl = book.image
    ? (book.image.startsWith('http')
        ? book.image
        : `${(process.env.NEXT_PUBLIC_LIBRARY_API || "").replace(/\/+$/,'')}/${book.image.replace(/^\/+/, '').replace(/\\/g, '/')}`)
    : null

  return (
    <div className="p-6 space-y-6">
      <Card title="Book Details">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="md:col-span-1">
            <div className="relative h-52 w-full border rounded-lg overflow-hidden">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={book.name} className="object-cover h-full w-full" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <div>
              <p className="text-gray-500">Title</p>
              <p className="font-semibold">{book.name}</p>
            </div>

            <div>
              <p className="text-gray-500">Author</p>
              <p className="font-semibold">{book.authorName}</p>
            </div>

            <div>
              <p className="text-gray-500">Language</p>
              <p className="font-semibold">{book.language}</p>
            </div>

            <div>
              <p className="text-gray-500">Availability</p>
              <Tag value={book.isAvailable ? 'Available' : 'Unavailable'} severity={book.isAvailable ? 'success' : 'danger'} />
            </div>

            <div>
              <p className="text-gray-500">Created At</p>
              <p className="font-medium">{book.createdAt ? new Date(book.createdAt).toLocaleString() : '-'}</p>
            </div>
          </div>

          <div className="md:col-span-3">
            <p className="text-gray-500">Description</p>
            <p className="font-medium whitespace-pre-line">{book.description}</p>
          </div>
        </div>
      </Card>

      <ToastContainer />
    </div>
  )
}
