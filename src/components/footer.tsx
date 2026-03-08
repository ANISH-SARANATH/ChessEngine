import { Mail, MapPin, Clock } from 'lucide-react';

const Users = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const Trophy = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2" />
    <path d="M6 5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2" />
    <path d="M9 13h6" />
  </svg>
);

export function Footer() {
  return (
    <footer className="bg-foreground text-primary-foreground py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-foreground rounded-lg flex items-center justify-center">
                <span className="text-foreground font-bold">♔</span>
              </div>
              <span className="font-bold text-lg">Chess Tournament</span>
            </div>
            <p className="text-sm opacity-80">
              Play chess online in multiple formats - Blitz, Rapid, and Variant games with time-controlled matches.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="#tournament" className="hover:opacity-100 transition">Tournament</a></li>
              <li><a href="#formats" className="hover:opacity-100 transition">Formats</a></li>
              <li><a href="#tokens" className="hover:opacity-100 transition">Harmony Tokens</a></li>
              <li><a href="#teams" className="hover:opacity-100 transition">Teams</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold mb-4">Event Details</h3>
            <ul className="space-y-3 text-sm opacity-80">
              <li className="flex items-center gap-2">
                <Clock size={16} />
                <span>~2hr 20min duration</span>
              </li>
              <li className="flex items-center gap-2">
                <Users size={16} />
                <span>Teams of 2 players</span>
              </li>
              <li className="flex items-center gap-2">
                <Trophy size={16} />
                <span>Prize pool available</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-primary-foreground/20 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm opacity-60">
              © 2024 Chess Tournament. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0 text-sm opacity-60">
              <a href="#" className="hover:opacity-100 transition">Privacy</a>
              <a href="#" className="hover:opacity-100 transition">Terms</a>
              <a href="#" className="hover:opacity-100 transition">Contact</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
