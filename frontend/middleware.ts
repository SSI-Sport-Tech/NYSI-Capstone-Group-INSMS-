import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = [
    '/auth-callback',  // ← add this
    '/login',
    '/api/auth/login',
    '/api/auth/verify-2fa',
    '/api/auth/request-password-reset',
    '/api/auth/reset-password',
]

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const strippedPath = pathname.replace('/noms', '') || '/'

    if (PUBLIC_PATHS.some(path => strippedPath.startsWith(path))) {
        return NextResponse.next()
    }

    if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
        return NextResponse.next()
    }

    // NOMS uses localStorage for auth — let client-side AuthContext handle redirects
    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)',
    ],
}