"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, Scale, ChevronRight, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import ThemeToggle from "@/components/theme-toggle"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState("home")
  const { user, logout } = useAuth()
  const { data: session } = useSession();
  const router = useRouter()

  const isLoggedIn = !!user || !!session;

  const handleLogout = () => {
    if (user) logout();
    if (session) signOut();
    router.push("/auth")
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)

      // Update active section based on scroll position
      const sections = ["home", "features", "upload", "qa", "tts"]
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const offsetTop = element.offsetTop
          const offsetHeight = element.offsetHeight

          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const navLinks = [
    { name: "Home", href: "#home", id: "home" },
    { name: "Features", href: "#features", id: "features" },
    { name: "Upload", href: "#upload", id: "upload" },
    { name: "Q&A", href: "#qa", id: "qa" },
    { name: "Text-to-Speech", href: "#tts", id: "tts" },
    { name: "About", href: "#about", id: "about" },
  ]

  return (
    <header className={`navbar-frosted ${scrolled ? "navbar-frosted-scrolled py-2" : "py-4"}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-bold text-xl flex items-center gap-2 z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1,
              }}
              className="bg-primary/10 p-2 rounded-lg"
            >
              <Scale className="h-6 w-6 text-primary" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="gradient-text font-bold"
            >
              TALQS
            </motion.span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link, index) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
              >
                <Link
                  href={link.href}
                  className={`nav-link text-sm font-medium px-2 py-1 ${
                    activeSection === link.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveSection(link.id)}
                >
                  {link.name}
                  {activeSection === link.id && (
                    <motion.div
                      layoutId="activeSection"
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.6,
              }}
            >
              <ThemeToggle />
            </motion.div>

            {isLoggedIn ? (
              <>
                {/* Show admin dashboard if custom user is admin, or just show for all logged-in if using NextAuth only */}
                {user?.isAdmin && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.7,
                    }}
                    className="hidden md:block"
                  >
                    <Link href="/admin">
                      <Button variant="outline" className="mr-2 glass">
                        Admin Dashboard
                      </Button>
                    </Link>
                  </motion.div>
                )}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.7,
                  }}
                  className="hidden md:block"
                >
                  <Link href="/profile">
                    <Button variant="outline" className="mr-2 glass">
                      Profile
                    </Button>
                  </Link>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.8,
                  }}
                  className="hidden md:block"
                >
                  <Button onClick={handleLogout} variant="outline" className="glass">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.7,
                  }}
                  className="hidden md:block"
                >
                  <Link href="/auth">
                    <Button variant="outline" className="mr-2 glass">
                      Log in
                    </Button>
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.8,
                  }}
                  className="hidden md:block"
                >
                  <Link href="/auth?tab=signup">
                    <Button className="btn-premium glow-primary">
                      <span>Sign up</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </motion.div>
              </>
            )}

            {/* Mobile Menu Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.6,
              }}
              className="md:hidden"
            >
              <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleMenu}>
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t"
          >
            <div className="container mx-auto px-4 py-4">
              <nav className="flex flex-col space-y-4">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      href={link.href}
                      className={`py-2 block transition-colors ${
                        activeSection === link.id ? "text-primary font-medium" : "text-foreground hover:text-primary"
                      }`}
                      onClick={() => {
                        setActiveSection(link.id)
                        setIsOpen(false)
                      }}
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
                {isLoggedIn ? (
                  <div className="pt-2 space-y-2">
                    {user?.isAdmin && (
                      <Link href="/admin" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full">
                          Admin Dashboard
                        </Button>
                      </Link>
                    )}
                    <Link href="/profile" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Profile
                      </Button>
                    </Link>
                    <Button onClick={handleLogout} variant="outline" className="w-full">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 space-y-2">
                    <Link href="/auth" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Log in
                      </Button>
                    </Link>
                    <Link href="/auth?tab=signup" onClick={() => setIsOpen(false)}>
                      <Button className="w-full btn-premium">Sign up</Button>
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
