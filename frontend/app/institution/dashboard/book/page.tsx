"use client";

import React, { useEffect, useState } from "react";
import BookCard from "@/components/institution/BookCart";
import microInstance from "@/service/micro.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import EditBookForm from "@/components/institution/EditBooks";


const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="text-6xl mb-4">📚</div>
    <h2 className="text-xl font-semibold text-gray-700">
      No Books Available
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven’t added any  Books yet. Once you create a  Books, it will appear
      here for management.
    </p>
  </div>
);





function Page() {
  const [loading, setLoading] = useState(false);
  const [bookData, setBookData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);






  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  /* ================= GET TOKEN ================= */
  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    if (token) {
      bookDataGet()
    }
  }, [token]);

  const bookDataGet = async () => {
    try {
      setLoading(true);

      const res = await microInstance.get("/book/allbooks", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      console.log("Book Data Response:", res);

      setBookData(res?.data?.books);
      setTotalRecords(res.data.pagination?.total || 0);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };



  const handelDelete = async (id: any) => {
    if (!id) return;
    // confirm deletion
    if (!confirm("Are you sure you want to delete this book?")) return;

    try {
      // use backend's actual route and include auth + credentials
      const res = await microInstance.delete(`/book/deletebook/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });
      toast.success(res.data.message);
      await bookDataGet();
    } catch (error: any) {
      console.error("Delete Error:", error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Delete failed");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  }
  const handleUpdate = (rowData: any) => {
    console.log("==>", rowData)
    setSelectedBook(rowData);
    setVisible(true);
  };

  return (
    <div className="w-full  flex justify-center items-center">
      {loading && (
        <div className="flex justify-center items-center h-full text-gray-500">
          Loading courses...
        </div>
      )}
      {!loading && bookData.length === 0 && <EmptyState />}
      {!loading && bookData.length > 0 && (

        <BookCard onDelete={handelDelete} books={bookData} onEdit={handleUpdate} />

      )}


      <ToastContainer />
      <Dialog
        header="Edit Books"
        visible={visible}
        style={{ width: "30vw" }}
        onHide={() => setVisible(false)}
      >
        <EditBookForm onClose={() => setVisible(false)} book={selectedBook} refetch={bookDataGet} />
      </Dialog>
    </div>
  );
}

export default Page;
