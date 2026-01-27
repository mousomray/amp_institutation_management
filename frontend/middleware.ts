import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const adminToken = request.cookies.get('admin-token')?.value
  const institutionToken = request.cookies.get('institution-token')?.value

  const isAdminRoute = pathname.startsWith('/admin')
  const isInstitutionRoute = pathname.startsWith('/institution')

  const isAdminLoginPage = pathname === '/admin/login'
  const isInstitutionLoginPage = pathname === '/institution/login'

  const PUBLIC_ROUTES = [
    '/',
    '/admin',
    '/admin/login',
    '/institution',
    '/institution/login',
  ]

  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  const secret = new TextEncoder().encode(process.env.TOKEN_SECRET)

  if (isAdminRoute) {
    if (!adminToken && !isAdminLoginPage) {
      return NextResponse.redirect(
        new URL('/admin/login', request.url)
      )
    }

    if (adminToken) {
      try {
        await jwtVerify(adminToken, secret)

        if (isAdminLoginPage) {
          return NextResponse.redirect(
            new URL('/admin/dashboard', request.url)
          )
        }

        return NextResponse.next()
      } catch (error) {
        const res = NextResponse.redirect(
          new URL('/admin/login', request.url)
        )
        res.cookies.set('admin-token', '', { maxAge: 0, path: '/' })
        return res
      }
    }
  }

  if (isInstitutionRoute) {
    if (!institutionToken && !isInstitutionLoginPage) {
      return NextResponse.redirect(
        new URL('/institution/login', request.url)
      )
    }

    if (institutionToken) {
      try {
        await jwtVerify(institutionToken, secret)

        if (isInstitutionLoginPage) {
          return NextResponse.redirect(
            new URL('/institution/dashboard', request.url)
          )
        }

        return NextResponse.next()
      } catch (error) {
        const res = NextResponse.redirect(
          new URL('/institution/login', request.url)
        )
        res.cookies.set('institution-token', '', { maxAge: 0, path: '/' })
        return res
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/institution/:path*'],
}
