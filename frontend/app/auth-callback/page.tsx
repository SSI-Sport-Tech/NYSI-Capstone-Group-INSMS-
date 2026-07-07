'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            router.push('/login');
            return;
        }
        axios.get('/noms/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then((res) => {
                login(token, res.data.user);
                const redirect = sessionStorage.getItem('noms_redirect');
                sessionStorage.removeItem('noms_redirect');
                router.push(redirect || '/');
            })
            .catch(() => {
                router.push('/login');
            });
    }, []);
    return (
        <div className="flex h-screen items-center justify-center bg-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-500">Signing you in...</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}