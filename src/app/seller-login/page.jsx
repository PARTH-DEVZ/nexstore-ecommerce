'use client'
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { setUser } from '@/store/userSlice';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { supabase } from '@/lib/supabaseClient';

const InputField = ({
    type = 'text',
    placeholder,
    value,
    onChange,
    error,
    showToggle = false,
    showValue = false,
    onToggle,
    disabled = false
}) => (
    <div className="mb-4">
        <div className="relative">
            <input
                type={showToggle ? (showValue ? 'text' : 'password') : type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 transition-all ${error
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
                    } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}

            />
            {showToggle && (
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                    {showValue ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            )}
        </div>
        {error && (
            <div className="flex items-center mt-1 text-red-600 text-xs">
                <AlertCircle size={14} className="mr-1" />
                {error}
            </div>
        )}
    </div>
);


const page = () => {
    const dispatch = useDispatch();
    const router = useRouter();
    const [businessName, setBusinessName] = useState('')
    const [gstNumber, setGstNumber] = useState('')
    const [currentStep, setCurrentStep] = useState('initial');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isExistingUser, setIsExistingUser] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false)
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [resendTimer, setResendTimer] = useState(60);
    const [isResendDisabled, setIsResendDisabled] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpPurpose, setOtpPurpose] = useState('');


    useEffect(() => {
        console.log(currentStep)
    }, [currentStep])

    useEffect(() => {
        let interval;
        if (isResendDisabled && resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
        }

        if (resendTimer === 0) {
            setIsResendDisabled(false);
            clearInterval(interval);
        }

        return () => clearInterval(interval);
    }, [resendTimer, isResendDisabled]);

    const sendOtpToEmail = async (email) => {
        try {
            const input = email.trim();
            await supabase.auth.signInWithOtp({ email: input });
            setCurrentStep("verify-otp");
        } catch (err) {
            console.error("Unexpected error sending OTP:", err);
            return { success: false, error: "Unexpected error" };
        }
    };

    const resendOtpToEmail = async () => {
        try {
            const input = email.trim(); // using the email state
            const { error } = await supabase.auth.signInWithOtp({
                email: input,
                options: {
                    shouldCreateUser: false,
                },
            });

            if (error) {
                console.log("Resend OTP failed:", error.message);
                setErrors({ otp: 'Failed to send OTP. Try again later.' });
                return;
            }

            setErrors({});
            setIsResendDisabled(true);
            setResendTimer(60);
            toast.success("OTP SENT AGAIN.");
        } catch (err) {
            console.error("Unexpected error resending OTP:", err);
            setErrors({ otp: 'Something went wrong. Please try again.' });
        }
    };


    const handleClose = () => {
        router.push('/'); // 🔁 Redirects to homepage
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone) => {
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(phone);
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();

        const input = email.trim();
        const newErrors = {};

        // Email validation for seller
        if (!input) {
            newErrors.email = 'Enter your email address';
        } else if (!validateEmail(input)) {
            newErrors.email = 'Enter a valid email address';
        }

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setEmail(input);
        setLoading(true);

        try {
            const res = await fetch('/api/auth/check-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: input }),
                redirect: 'manual',
            });

            if (res.redirected || res.status === 302) {
                window.location.href = res.url || '/seller-login';
                return;
            }

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Server error');

            const { exists, role } = data;

            if (exists && role === 'seller') {
                setCurrentStep('signin');
            } else if (!exists) {
                await supabase.auth.signInWithOtp({ email: input });
                setCurrentStep('verify-email');
            } else {

                setErrors({ email: 'This email is not registered as a seller account.' });
            }
        } catch (err) {
            setErrors({ email: err.message });
        } finally {
            setLoading(false);
        }
    };


    const resetForm = () => {
        setCurrentStep('initial');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setName('');
        setPhone('');
        setErrors({});
        setShowPassword(false);
        setShowConfirmPassword(false);
    };


    const handleSignUp = async (e) => {
        e.preventDefault();
        const newErrors = {};

        // -------- basic validations --------
        if (!name.trim()) newErrors.name = 'Enter your name';
        if (!businessName.trim()) newErrors.businessName = 'Enter business name';

        if (!gstNumber.trim()) {
            newErrors.gstNumber = 'Enter GST number';
        } else if (!/^[0-9A-Z]{15}$/.test(gstNumber.trim())) {
            newErrors.gstNumber = 'GST number must be 15 chars (A–Z, 0–9)';
        }

        if (!email.trim()) newErrors.email = 'Email is required';
        if (!phone.trim()) newErrors.phone = 'Enter mobile number';
        else if (!validatePhone(phone)) newErrors.phone = 'Enter a valid 10-digit number';

        if (!password) newErrors.password = 'Enter password';
        else if (password.length < 6) newErrors.password = 'Min 6 characters';

        if (!confirmPassword) newErrors.confirmPassword = 'Re-enter password';
        else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords must match';

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }
        setErrors({});

        setLoading(true)
        const dup = await fetch('/api/auth/check-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, phone }),
        });
        const dupData = await dup.json();
        if (dupData.exists) {
            setErrors({ phone: 'Already registered' });
            return;
        }


        try {
            const res = await fetch('/api/auth/register-seller', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    password,
                    businessName,
                    gstNumber,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setErrors({ general: data.error || 'Signup failed' });
                setLoading(false)
                setCurrentStep('initial')
                return;
            }

            toast.success('Seller account created!');
            resetForm();
            setCurrentStep('signup')
            setLoading(false)
        } catch (err) {
            console.error(err);
            toast.error('Signup failed. Try again.');
        }
    };


    const handleSignIn = async (e) => {
        e.preventDefault();

        const newErrors = {};

        if (!password) {
            newErrors.password = 'Enter your password';
        } else if (password.length < 6) {
            newErrors.password = 'Your password is incorrect';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            setLoading(true)
            const response = await fetch('/api/auth/login-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, phone, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setErrors({ password: data.error || 'Login failed' });
                setLoading(false)
                return;
            }

            dispatch(setUser(data.user));
            router.push('/');
            setLoading(false)
        } catch (error) {
            console.error(error);
            setErrors({ password: 'Server error, try again later' });
        }
    };

    const handleOtpVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        const { error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'email',
        });

        if (error) {
            setErrors({ otp: 'Invalid or expired OTP' });
            setLoading(false);
            return;
        }

        setCurrentStep('signup');

        setLoading(false);
    };

    const handleOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        const { error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'email',
        });

        if (error) {
            setErrors({ otp: 'Invalid or expired OTP' });
            setLoading(false);
            return;
        }

        setCurrentStep('password'); // or 'reset-password'

        setLoading(false);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        const newErrors = {};

        if (!newPass) {
            newErrors.newPass = 'Enter your new password';
        } else if (newPass.length < 6) {
            newErrors.newPass = 'Password must be at least 6 characters';
        }

        if (!confirmPass) {
            newErrors.confirmPass = 'Confirm your password';
        } else if (newPass !== confirmPass) {
            newErrors.confirmPass = 'Passwords do not match';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            setLoading(true);

            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, newPassword: newPass }),
            });

            const data = await response.json();

            if (response.status === 401) {
                setErrors({ newPass: 'Session expired. Please try again.' });
                setLoading(false);
                return;
            }

            if (!response.ok) {
                setErrors({ newPass: data.error || 'Password change failed. Try again.' });
                setLoading(false);
                return;
            }


            setLoading(false);
            setCurrentStep('signin'); // or handle success as needed

        } catch (error) {
            console.error('Password change error:', error);
            setErrors({ newPass: 'Server error, try again later' });
            setLoading(false);
        }
    };


    if (currentStep === 'initial') {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <button
                    className="fixed top-4 right-4 z-50 text-gray-600 hover:text-black text-2xl font-bold focus:outline-none"
                    onClick={handleClose}
                >
                    &times;
                </button>
                <div className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-sm">
                        {/* Logo */}
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">NEXSTORE</h1>
                            <div className="w-50 h-1 bg-blue-400 mx-auto mt-1 rounded"></div>
                        </div>

                        {/* Form Container */}
                        <div className="border border-gray-300 rounded-lg p-6">
                            <h2 className="text-xl font-medium mb-4">SIGN IN OR CREATE ACCOUNT</h2>

                            <form onSubmit={handleEmailSubmit}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ENTER MOBILE NUMBER OR EMAIL
                                </label>

                                <InputField
                                    type="text"
                                    placeholder="Enter buisness email or phone "
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    error={errors.email}
                                />

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full bg-blue-400 hover:bg-blue-500 text-black py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${loading ? "cursor-not-allowed opacity-75" : ""
                                        }`}
                                >
                                    {loading ? (
                                        <>
                                            <svg
                                                className="animate-spin h-5 w-5 text-black"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v8z"
                                                />
                                            </svg>
                                            <span className="ml-2">LOADING...</span>
                                        </>
                                    ) : (
                                        "CONTINUE"
                                    )}
                                </button>

                            </form>

                            <div className="mt-4 text-xs text-gray-600">
                                By continuing, you agree to Nexstore's{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                                    Conditions of Use
                                </a>{' '}
                                and{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                                    Privacy Notice
                                </a>
                                .
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-300">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">ALREADY A CUSTOMER ?</h3>
                                <a href="/login" className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
                                    Create a customer account
                                </a>
                            </div>
                        </div>

                        {/* Footer */}

                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-700 mb-2 uppercase">Need Help?</h4>
                            <div className="text-xs text-gray-600 space-y-1">
                                <div>• Having trouble accessing your account?</div>
                                <div>• Need to update your business information?</div>
                            </div>
                            <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline text-xs mt-2 inline-block">
                                Contact Seller Support
                            </a>
                        </div>
                        <div className="text-center mt-8 text-xs text-gray-500 space-x-4">
                            <a href="#" className="hover:text-blue-600">Conditions of Use</a>
                            <a href="#" className="hover:text-blue-600">Privacy Notice</a>
                            <a href="#" className="hover:text-blue-600">Help</a>
                        </div>
                        <div className="text-center mt-2 text-xs text-gray-500">
                            © 2025, Nexstore.com, Inc. or its affiliates
                        </div>
                    </div>
                </div>
                {/* <Footer /> */} {/* Uncomment this when you have the Footer component */}
            </div>
        );
    }

    if (currentStep === 'signup') {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <button
                    className="fixed top-4 right-4 z-50 text-gray-600 hover:text-black text-2xl font-bold focus:outline-none"
                    onClick={handleClose}
                >
                    &times;
                </button>
                <div className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-sm">
                        {/* Logo */}
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">NEXSTORE</h1>
                            <div className="w-20 h-1 bg-blue-400 mx-auto mt-1 rounded"></div>
                        </div>

                        {/* Form Container */}
                        <div className="border border-gray-300 rounded-lg p-6">
                            <h2 className="text-xl font-medium mb-4">CREATE ACCOUNT</h2>

                            <form onSubmit={handleSignUp}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    YOUR NAME
                                </label>
                                <InputField
                                    type="text"
                                    placeholder="First and last name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    error={errors.name}
                                />



                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    BUSINESS NAME
                                </label>
                                <InputField
                                    placeholder="e.g. Acme Pvt Ltd"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    error={errors.businessName}
                                />

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    GST NUMBER
                                </label>
                                <InputField
                                    placeholder="15-digit GSTIN"
                                    value={gstNumber}
                                    onChange={(e) => setGstNumber(e.target.value)}
                                    error={errors.gstNumber}
                                />
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    EMAIL
                                </label>
                                <InputField
                                    type="email"
                                    placeholder="eg seller@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    error={errors.email}
                                    disabled={true}
                                />

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    MOBILE NUMBER
                                </label>
                                <InputField
                                    type="tel"
                                    placeholder="Mobile number"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    error={errors.phone}
                                />

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    PASSWORD
                                </label>
                                <InputField
                                    type="password"
                                    placeholder="At least 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    error={errors.password}
                                    showToggle={true}
                                    showValue={showPassword}
                                    onToggle={() => setShowPassword(!showPassword)}
                                />

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    CONFIRM PASSWORD
                                </label>
                                <InputField
                                    type="password"
                                    placeholder="Type your password again"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    error={errors.confirmPassword}
                                    showToggle={true}
                                    showValue={showConfirmPassword}
                                    onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                                />

                                {errors.general && (
                                    <div className="mb-4 text-red-600 text-sm">
                                        {errors.general}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full bg-blue-400 hover:bg-blue-500 text-black py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${loading ? "cursor-not-allowed opacity-75" : ""
                                        }`}
                                >
                                    {loading ? (
                                        <>
                                            <svg
                                                className="animate-spin h-5 w-5 text-black"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v8z"
                                                />
                                            </svg>
                                            <span className="ml-2">CREATING ACCOUNT...</span>
                                        </>
                                    ) : (
                                        "REGISTER ACCOUNT"
                                    )}
                                </button>

                            </form>

                            <div className="mt-4 text-xs text-gray-600">
                                By creating an account, you agree to Nexstore's{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                                    Conditions of Use
                                </a>{' '}
                                and{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                                    Privacy Notice
                                </a>
                                .
                            </div>

                            <div className="mt-4">
                                <span className="text-sm text-gray-600">
                                    Already have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep('signin')}
                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        Sign in
                                    </button>
                                </span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-8 text-xs text-gray-500 space-x-4">
                            <a href="#" className="hover:text-blue-600">CONDITIONS OF USE</a>
                            <a href="#" className="hover:text-blue-600">PRIVACY NOTICE</a>
                            <a href="#" className="hover:text-blue-600">HELP</a>
                        </div>
                        <div className="text-center mt-2 text-xs text-gray-500">
                            © 2025, NEXSTORE.COM, INC. OR ITS AFFILIATES
                        </div>
                    </div>
                </div>
                {/* <Footer /> */} {/* Uncomment this when you have the Footer component */}
            </div>
        );
    }

    if (currentStep === 'signin') {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <button
                    className="fixed top-4 right-4 z-50 text-gray-600 hover:text-black text-2xl font-bold focus:outline-none"
                    onClick={handleClose}
                >
                    &times;
                </button>
                <div className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-sm">
                        {/* Logo */}
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">NEXSTORE</h1>
                            <div className="w-20 h-1 bg-blue-400 mx-auto mt-1 rounded"></div>
                        </div>

                        {/* Form Container */}
                        <div className="border border-gray-300 rounded-lg p-6">
                            <h2 className="text-xl font-medium mb-4">SIGN IN</h2>

                            <div className="mb-4">
                                <div className="text-sm text-gray-600 mb-2">
                                    <span className="font-medium">{email || phone}</span>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="ml-2 text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        CHANGE
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSignIn}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    PASSWORD
                                </label>

                                <InputField
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    error={errors.password}
                                    showToggle={true}
                                    showValue={showPassword}
                                    onToggle={() => setShowPassword(!showPassword)}
                                />

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full bg-blue-400 hover:bg-blue-500 text-black py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${loading ? "cursor-not-allowed opacity-75" : ""
                                        }`}
                                >
                                    {loading ? (
                                        <>
                                            <svg
                                                className="animate-spin h-5 w-5 text-black"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v8z"
                                                />
                                            </svg>
                                            <span className="ml-2">SIGNING IN...</span>
                                        </>
                                    ) : (
                                        "SIGN IN"
                                    )}
                                </button>

                            </form>

                            <div className="mt-4 text-xs text-gray-600">
                                By continuing, you agree to Nexstore's{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                                    Conditions of Use
                                </a>{' '}
                                and{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                                    Privacy Notice
                                </a>
                                .
                            </div>

                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => sendOtpToEmail(email)}

                                    className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                >
                                    Forgot your password?
                                </button>
                            </div>
                        </div>

                        {/* New to NEXSTORE */}
                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">NEW TO NEXSTORE?</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setCurrentStep('signup')}
                                className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-black py-2 px-4 rounded-md text-sm font-medium transition-colors border border-gray-300"
                            >
                                CREATE YOUR NEXSTORE ACCOUNT
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-8 text-xs text-gray-500 space-x-4">
                            <a href="#" className="hover:text-blue-600">CONDITIONS OF USE</a>
                            <a href="#" className="hover:text-blue-600">PRIVACY NOTICE</a>
                            <a href="#" className="hover:text-blue-600">HELP</a>
                        </div>
                        <div className="text-center mt-2 text-xs text-gray-500">
                            © 2025, NEXSTORE.COM, INC. OR ITS AFFILIATES
                        </div>
                    </div>
                </div>
                {/* <Footer /> */} {/* Uncomment this when you have the Footer component */}
            </div>
        );
    }

    if (currentStep === 'verify-email') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <button
                    className="fixed top-4 right-4 z-50 text-gray-600 hover:text-black text-2xl font-bold focus:outline-none"
                    onClick={handleClose}
                >
                    &times;
                </button>
                <div className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-sm">
                        {/* Logo */}
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">NEXSTORE</h1>
                            <div className="w-40 h-1 bg-blue-400 mx-auto mt-1 rounded"></div>
                        </div>

                        {/* Form Container */}
                        <div className="border border-gray-300 rounded-lg p-6">
                            <h2 className="text-lg font-medium mb-4">VERIFY YOUR EMAIL</h2>

                            <form onSubmit={handleOtpVerify}>
                                <div className="mb-4">
                                    <p className="text-sm text-gray-600 mb-4">
                                        <span className="font-medium text-gray-900">{email}</span>
                                    </p>
                                </div>

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ENTER VERIFICATION CODE
                                </label>

                                <InputField
                                    type="text"
                                    placeholder="Enter OTP"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    error={errors.otp}
                                />

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full bg-blue-400 hover:bg-blue-500 text-black py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${loading ? "cursor-not-allowed opacity-75" : ""
                                        }`}
                                >
                                    {loading ? (
                                        <>
                                            <svg
                                                className="animate-spin h-5 w-5 text-black"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v8z"
                                                />
                                            </svg>
                                            <span className="ml-2">VERIFYING...</span>
                                        </>
                                    ) : (
                                        "VERIFY OTP"
                                    )}
                                </button>
                            </form>

                            <div className="mt-4 text-xs text-gray-600">
                                By continuing, you agree to Nexstore's{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                                    Conditions of Use
                                </a>{' '}
                                and{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                                    Privacy Notice
                                </a>
                                .
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-300">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">DIDN'T RECEIVE THE CODE?</h3>
                                <button
                                    onClick={resendOtpToEmail}
                                    type="button"
                                    disabled={isResendDisabled}
                                    className={`text-sm ${isResendDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800 hover:underline'}`}
                                >
                                    Resend verification code
                                    {isResendDisabled && <span> ({resendTimer}s)</span>}
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-8 text-xs text-gray-500 space-x-4">
                            <a href="#" className="hover:text-blue-600">Conditions of Use</a>
                            <a href="#" className="hover:text-blue-600">Privacy Notice</a>
                            <a href="#" className="hover:text-blue-600">Help</a>
                        </div>
                        <div className="text-center mt-2 text-xs text-gray-500">
                            © 2025, Nexstore.com, Inc. or its affiliates
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (currentStep === 'verify-otp') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <button
                    className="fixed top-4 right-4 z-50 text-gray-600 hover:text-black text-2xl font-bold focus:outline-none"
                    onClick={handleClose}
                >
                    &times;
                </button>
                <div className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-sm">
                        {/* Logo */}
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">NEXSTORE</h1>
                            <div className="w-40 h-1 bg-blue-400 mx-auto mt-1 rounded"></div>
                        </div>

                        {/* Form Container */}
                        <div className="border border-gray-300 rounded-lg p-6">
                            <h2 className="text-lg font-medium mb-4">PASSWORD CHANGE</h2>

                            <form onSubmit={handleOtp}>
                                <div className="mb-4">
                                    <p className="text-sm text-gray-600 mb-4">
                                        <span className="font-medium text-gray-900">{email}</span>
                                    </p>
                                </div>

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ENTER VERIFICATION CODE
                                </label>

                                <InputField
                                    type="text"
                                    placeholder="Enter OTP"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    error={errors.otp}
                                />


                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full bg-blue-400 hover:bg-blue-500 text-black py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${loading ? "cursor-not-allowed opacity-75" : ""
                                        }`}
                                >
                                    {loading ? (
                                        <>
                                            <svg
                                                className="animate-spin h-5 w-5 text-black"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v8z"
                                                />
                                            </svg>
                                            <span className="ml-2">VERIFYING...</span>
                                        </>
                                    ) : (
                                        "VERIFY OTP"
                                    )}
                                </button>
                            </form>

                            <div className="mt-4 text-xs text-gray-600">
                                By continuing, you agree to Nexstore's{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                                    Conditions of Use
                                </a>{' '}
                                and{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                                    Privacy Notice
                                </a>
                                .
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-300">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">DIDN'T RECEIVE THE CODE?</h3>
                                <button
                                    onClick={resendOtpToEmail}
                                    type="button"
                                    disabled={isResendDisabled}
                                    className={`text-sm ${isResendDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800 hover:underline'}`}
                                >
                                    Resend verification code
                                    {isResendDisabled && <span> ({resendTimer}s)</span>}
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-8 text-xs text-gray-500 space-x-4">
                            <a href="#" className="hover:text-blue-600">Conditions of Use</a>
                            <a href="#" className="hover:text-blue-600">Privacy Notice</a>
                            <a href="#" className="hover:text-blue-600">Help</a>
                        </div>
                        <div className="text-center mt-2 text-xs text-gray-500">
                            © 2025, Nexstore.com, Inc. or its affiliates
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (currentStep === 'password') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <button
                    className="fixed top-4 right-4 z-50 text-gray-600 hover:text-black text-2xl font-bold focus:outline-none"
                    onClick={handleClose}
                >
                    &times;
                </button>
                <div className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-sm">
                        {/* Logo */}
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">NEXSTORE</h1>
                            <div className="w-40 h-1 bg-blue-400 mx-auto mt-1 rounded"></div>
                        </div>

                        {/* Form Container */}
                        <div className="border border-gray-300 rounded-lg p-6">
                            <h2 className="text-lg font-medium mb-4">PASSWORD CHANGE</h2>

                            <form onSubmit={handlePasswordChange}>
                                <div className="mb-4">
                                    <p className="text-sm text-gray-600 mb-4">
                                        <span className="font-medium text-gray-900">{email}</span>
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            NEW PASSWORD
                                        </label>
                                        <input
                                            type="password"
                                            value={newPass}
                                            onChange={(e) => setNewPass(e.target.value)}
                                            placeholder="Enter new password"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            CONFIRM PASSWORD
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPass}
                                            onChange={(e) => setConfirmPass(e.target.value)}
                                            placeholder="Confirm new password"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full bg-blue-400 hover:bg-blue-500 text-black py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${loading ? "cursor-not-allowed opacity-75" : ""
                                        }`}
                                >
                                    {loading ? (
                                        <>
                                            <svg
                                                className="animate-spin h-5 w-5 text-black"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v8z"
                                                />
                                            </svg>
                                            <span className="ml-2">LOADING</span>
                                        </>
                                    ) : (
                                        "CHANGE PASSWORD"
                                    )}
                                </button>
                            </form>

                            <div className="mt-4 text-xs text-gray-600">
                                By continuing, you agree to Nexstore's{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                                    Conditions of Use
                                </a>{' '}
                                and{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline">
                                    Privacy Notice
                                </a>
                                .
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-300">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">NEED HELP?</h3>
                                <button
                                    type="button"
                                    className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                >
                                    Contact customer support
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-8 text-xs text-gray-500 space-x-4">
                            <a href="#" className="hover:text-blue-600">Conditions of Use</a>
                            <a href="#" className="hover:text-blue-600">Privacy Notice</a>
                            <a href="#" className="hover:text-blue-600">Help</a>
                        </div>
                        <div className="text-center mt-2 text-xs text-gray-500">
                            © 2025, Nexstore.com, Inc. or its affiliates
                        </div>
                    </div>
                </div>
            </div>
        );
    }


}

export default page