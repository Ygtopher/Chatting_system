import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const otpSchema = z.object({
  token: z
    .string()
    .length(6, 'Enter the 6-digit code')
    .regex(/^\d{6}$/, 'Code must be exactly 6 digits')
});

type LoginFormValues = z.infer<typeof loginSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

export const LoginPage = () => {
  const { login, verifyOtp, isAuthenticated } = useAuth();
  const location = useLocation();
  const [showTokenForm, setShowTokenForm] = useState<boolean>(location.state?.showTokenForm ?? false);
  const [email, setEmail] = useState<string>(location.state?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const tokenForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      token: ''
    }
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await login(data.email, data.password);
      if (res.requires2FA) {
        setEmail(data.email);
        setShowTokenForm(true);
      }
    } catch (err: any) {
      const data = err.response?.data;
      const msg = typeof data === 'string' ? data : (data?.message || data?.error || err.message);
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const onTokenSubmit = async (data: OtpFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Submitting token for verification...');
      await verifyOtp(email, data.token);
      console.log('Token verification successful');
    } catch (err: any) {
      console.error('Token verification failed:', err);
      setError(err.message || 'Invalid verification token. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    console.log('User is authenticated, redirecting to home page...');
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {!showTokenForm ? (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="input w-full"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="input w-full"
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link to="/forgot-password" className="text-blue-600 hover:text-blue-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full flex justify-center"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={tokenForm.handleSubmit(onTokenSubmit)} className="space-y-6">
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                  Enter 6-Digit Code
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  We've sent a 6-digit verification code to <strong>{email}</strong>.
                </p>
                <div className="mt-3">
                  <input
                    id="token"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="\d{6}"
                    className="input w-full text-center tracking-[0.5em] text-2xl font-bold"
                    placeholder="000000"
                    {...tokenForm.register('token')}
                  />
                  {tokenForm.formState.errors.token && (
                    <p className="mt-1 text-sm text-red-600">
                      {tokenForm.formState.errors.token.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full flex justify-center"
                >
                  {isLoading ? 'Verifying...' : 'Verify Token'}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowTokenForm(false)}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Don't have an account?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link to="/register" className="text-blue-600 hover:text-blue-500">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 