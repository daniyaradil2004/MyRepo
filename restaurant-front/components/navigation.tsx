"use client"

import { memo, useState } from "react"
import { ChefHat, ShoppingCart, Heart, User, Menu, X, Search } from "lucide-react"
import Link from "next/link"

function Navigation({ cartCount = 0 }: { cartCount?: number }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/home" className="flex items-center gap-2">
          <div className="bg-primary rounded-full p-2">
            <ChefHat className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground hidden sm:inline">FoodFlow</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/home" className="text-foreground hover:text-primary font-medium transition">
            Menu
          </Link>
          <Link
            href="/search"
            className="text-foreground hover:text-primary font-medium transition flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </Link>
          <Link href="/favorites" className="text-foreground hover:text-primary font-medium transition">
            Favorites
          </Link>
          <Link href="/profile" className="text-foreground hover:text-primary font-medium transition">
            Profile
          </Link>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-4">
          <Link href="/search" className="hidden md:block">
            <Search className="w-6 h-6 text-foreground hover:text-primary cursor-pointer transition" />
          </Link>
          <Link href="/favorites" className="relative">
            <Heart className="w-6 h-6 text-foreground hover:text-primary cursor-pointer transition" />
          </Link>
          <Link href="/cart" className="relative">
            <ShoppingCart className="w-6 h-6 text-foreground hover:text-primary cursor-pointer transition" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Link href="/profile">
            <User className="w-6 h-6 text-foreground hover:text-primary cursor-pointer transition" />
          </Link>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border py-4 px-4 space-y-2">
          <Link href="/home" className="block py-2 text-foreground hover:text-primary transition">
            Menu
          </Link>
          <Link href="/search" className="block py-2 text-foreground hover:text-primary transition">
            Search
          </Link>
          <Link href="/favorites" className="block py-2 text-foreground hover:text-primary transition">
            Favorites
          </Link>
          <Link href="/profile" className="block py-2 text-foreground hover:text-primary transition">
            Profile
          </Link>
        </div>
      )}
    </nav>
  )
}

// Memoize to prevent re-renders when cartCount doesn't change
export default memo(Navigation)
