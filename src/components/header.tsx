import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-3xl">♘</span>
          <span className="font-bold text-lg text-foreground hidden sm:inline">Chess Tournament</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/game" className="text-foreground hover:text-primary transition font-medium">
            Play Game
          </Link>
          <a href="#tournament" className="text-foreground hover:text-primary transition">
            Tournament
          </a>
          <a href="#formats" className="text-foreground hover:text-primary transition">
            Formats
          </a>
          <a href="#rules" className="text-foreground hover:text-primary transition">
            Rules
          </a>
        </div>

        {/* Mobile Menu */}
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-background border-t border-border p-4 space-y-3">
          <Link to="/game" className="block text-foreground hover:text-primary py-2 font-medium">
            Play Game
          </Link>
          <a href="#tournament" className="block text-foreground hover:text-primary py-2">
            Tournament
          </a>
          <a href="#formats" className="block text-foreground hover:text-primary py-2">
            Formats
          </a>
          <a href="#rules" className="block text-foreground hover:text-primary py-2">
            Rules
          </a>
        </div>
      )}
    </header>
  );
}
