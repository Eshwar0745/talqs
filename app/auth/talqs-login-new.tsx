"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useSearchParams, useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { Eye, EyeOff, User, Mail, Lock, Calendar, ArrowRight, Scale, Gavel, FileText } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import "./auth.css"

export default function TalqsAuthPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(tabParam === "signup" ? "signup" : "login")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const { login, signup, user } = useAuth()

  // NextAuth session
  const { data: session, status } = useSession();

  // Form states
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Update active tab when URL changes
  useEffect(() => {
    if (tabParam === "signup") {
      setActiveTab("signup")
    } else if (tabParam === "login") {
      setActiveTab("login")
    }
  }, [tabParam])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      if (activeTab === "login") {
        // Login logic
        const success = await login(email, password)
        if (success) {
          router.push("/")
        } else {
          setError("Invalid email or password")
        }
      } else {
        // Signup validation
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setIsSubmitting(false)
          return
        }

        if (!dateOfBirth) {
          setError("Date of birth is required")
          setIsSubmitting(false)
          return
        }

        // Check if user is at least 13 years old
        const today = new Date()
        const birthDate = new Date(dateOfBirth)
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }

        if (age < 13) {
          setError("You must be at least 13 years old to sign up")
          setIsSubmitting(false)
          return
        }

        // Signup logic
        const success = await signup(email, password, fullName, dateOfBirth)
        if (success) {
          toast({
            title: "Account created",
            description: "Your account has been created successfully",
          })
          router.push("/")
        } else {
          setError("Failed to create account. Email may already be in use.")
        }
      }
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle social login
  const handleSocialLogin = async (provider: string) => {
    try {
      await signIn(provider, { callbackUrl: "/" })
    } catch (err) {
      console.error(`Error signing in with ${provider}:`, err)
      setError(`Failed to sign in with ${provider}`)
    }
  }

  return (
    <div className="auth-container">
      <Toaster />
      
      {/* Left side - Illustration */}
      <div className="auth-illustration">
        <div className="relative h-full w-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-white text-center z-10"
          >
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                  <Scale className="h-10 w-10 text-white" />
                </div>
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    duration: 3,
                    ease: "easeInOut",
                  }}
                  className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <Gavel className="h-5 w-5 text-white" />
                </motion.div>
                <motion.div
                  animate={{
                    y: [0, 10, 0],
                  }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    duration: 4,
                    ease: "easeInOut",
                  }}
                  className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <FileText className="h-4 w-4 text-white" />
                </motion.div>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">TALQ Legal</h1>
            <p className="max-w-md mx-auto text-white/80">
              Your AI-powered legal assistant for document analysis and legal research.
            </p>
          </motion.div>

          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: 30,
                ease: "linear",
              }}
              className="absolute top-1/4 left-1/4 w-full h-full bg-white/5 rounded-full blur-3xl"
              style={{ width: "60%", height: "60%" }}
            />
            <motion.div
              animate={{
                rotate: [360, 0],
              }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: 20,
                ease: "linear",
              }}
              className="absolute bottom-1/4 right-1/4 w-full h-full bg-white/5 rounded-full blur-3xl"
              style={{ width: "50%", height: "50%" }}
            />
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <span className="text-2xl font-bold gradient-text">TALQ Legal</span>
            </Link>
            <h2 className="text-2xl font-bold mb-2">
              {activeTab === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-muted-foreground">
              {activeTab === "login"
                ? "Enter your email to sign in to your account"
                : "Enter your information to create an account"}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-100 border border-red-300 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex rounded-lg bg-muted p-1 mb-6">
            <button
              type="button"
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === "login" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === "signup" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("signup")}
            >
              Sign up
            </button>
          </div>

          {/* Auth form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === "signup" && (
              <div>
                <label htmlFor="fullName" className="form-label">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="fullName"
                    type="text"
                    className="form-input pl-10"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={activeTab === "signup"}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  className="form-input pl-10"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="form-input pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {activeTab === "signup" && (
              <>
                <div>
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      className="form-input pl-10 pr-10"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={activeTab === "signup"}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="dateOfBirth" className="form-label">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <DatePicker
                      id="dateOfBirth"
                      selected={dateOfBirth}
                      onChange={(date) => setDateOfBirth(date)}
                      required={activeTab === "signup"}
                      dateFormat="MM/dd/yyyy"
                      showYearDropdown
                      dropdownMode="select"
                      className="form-input pl-10 w-full"
                      placeholderText="Select your date of birth"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "login" && (
              <div className="flex justify-end">
                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full btn-premium glow-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  {activeTab === "login" ? "Signing in..." : "Creating account..."}
                </div>
              ) : (
                <>
                  {activeTab === "login" ? "Sign in" : "Create account"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                type="button" 
                className="social-login-btn"
                onClick={() => handleSocialLogin("google")}
              >
                <Mail className="h-4 w-4" />
                <span>Google</span>
              </button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {activeTab === "login" ? (
                <>
                  Don't have an account?{" "}
                  <Link href="/auth?tab=signup" className="text-primary hover:underline">
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link href="/auth?tab=login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
