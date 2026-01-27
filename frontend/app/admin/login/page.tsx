'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AdminLoginSchema} from "@/helper/schema/Schema"
import axiosInstance from '@/service/axios.service'
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios'
import { useRouter } from 'next/navigation'
import {useAppDispatch} from "@/lib/store/hooks"
import {tokenSlice} from "../../../lib/store/features/storeToken"

type LoginForm = {
  email: string
  password: string
}

function Page() {
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const dispatch = useAppDispatch()
  type LoginForm = z.infer<typeof AdminLoginSchema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver : zodResolver(AdminLoginSchema)
  })

  const onSubmit = async (data: LoginForm) => {
    try {
    const res = await axiosInstance.post('/admin/login', data)
    toast.success(res.data.message)
    const token =  res.data.token
    console.log("->",token)
    dispatch(tokenSlice.actions.saveToken(token))
    reset()
    router.push("/admin/dashboard")
     localStorage.setItem("admin-token", res.data.token);
    return
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message || 'Something went wrong'
      toast.error(message)
    } else {
      toast.error('Unexpected error occurred')
    }
  }
  reset()
  }

  return (
    <div className="w-screen h-screen bg-surface">
      <div className="w-full h-full grid grid-cols-1 md:grid-cols-2">

      
        <div className="relative hidden md:block w-full h-full">
          <Image
            src="/assets/login-admin.jpg"
            alt="Admin Login"
            fill
            priority
            className="object-cover"
          />
        </div>

        
        <div className="flex flex-col justify-center px-6 sm:px-10 md:px-14 lg:px-20 bg-background">

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary mb-3">
            Admin Login
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-text-secondary mb-10 max-w-md">
            Secure access to manage your institution platform and operations
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 w-full max-w-md"
          >

           
            <div>
              <label className="block text-sm sm:text-base font-medium text-text-primary mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="admin@example.com"
                {...register('email', { required: 'Email is required' })}
                className="
                  w-full
                  px-3 sm:px-4
                  py-2 sm:py-2.5
                  text-sm sm:text-base
                  border border-border
                  rounded-lg
                  focus:ring-2
                  focus:ring-primary
                  focus:outline-none
                "
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            
            <div>
              <label className="block text-sm sm:text-base font-medium text-text-primary mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required' })}
                  className="
                    w-full
                    px-3 sm:px-4
                    py-2 sm:py-2.5
                    pr-10
                    text-sm sm:text-base
                    border border-border
                    rounded-lg
                    focus:ring-2
                    focus:ring-primary
                    focus:outline-none
                  "
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="
                    absolute
                    inset-y-0
                    right-3
                    flex
                    items-center
                    text-secondary
                    hover:text-primary
                  "
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Button */}
            <button
              type="submit"
              className="
                w-full
                bg-primary
                text-white
                py-2.5 sm:py-3
                rounded-lg
                text-base sm:text-lg
                font-semibold
                hover:bg-primary-hover
                transition
              "
            >
              Login
            </button>

          </form>
        </div>
      </div>
       <ToastContainer />
    </div>
  )
}

export default Page
