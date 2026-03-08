import { ChevronRight, Zap, Shield, Trophy, Clock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StaticChessBoard } from './static-chess-board';

export function Hero() {
  return (
    <section className="relative bg-gradient-to-b from-background via-secondary to-background py-24 md:py-32 px-4 overflow-hidden">
      {/* Simple background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0.02)_0%,transparent_50%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
              <Zap size={16} />
              <span className="text-sm font-semibold">Cultural Chess Tournament</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl md:text-6xl font-black text-foreground">
              WHERE STRATEGY
              <br />
              MEETS{' '}
              <span className="text-primary">CULTURE</span>
            </h1>

            {/* Description */}
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
              Experience chess like never before with unique cultural pieces, 
              special powers, and strategic harmony tokens.
            </p>

            {/* Feature Tags */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              {[
                { text: 'Special Powers', icon: Zap },
                { text: 'Cultural Pieces', icon: Shield },
                { text: 'Tournament Mode', icon: Trophy },
              ].map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-secondary border border-border px-4 py-2 rounded-full"
                  >
                    <Icon size={14} className="text-primary" />
                    <span className="text-sm font-medium text-foreground">{feature.text}</span>
                  </div>
                );
              })}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
              <Link to="/game">
                <button className="group px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-all inline-flex items-center gap-2">
                  Play Now
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <button className="px-8 py-3 border-2 border-primary text-primary rounded-full font-semibold hover:bg-secondary transition">
                Learn Rules
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 max-w-md mx-auto lg:mx-0">
              {[
                { value: '3', label: 'Game Formats', icon: Clock },
                { value: '∞', label: 'Play Anytime', icon: Zap },
                { value: '100%', label: 'Free to Play', icon: Trophy },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
                      <Icon size={18} className="text-primary" />
                      <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Content - Enhanced Chess Board */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl" />
              
              {/* Main board container */}
              <div className="relative transform hover:scale-105 transition-transform duration-500">
                {/* Gradient border */}
               {/* Board with enhanced presentation */}

                <div className="relative bg-card border-2 border-border rounded-xl shadow-2xl overflow-hidden transform -translate-x-29">
                  <StaticChessBoard />
                </div>

                {/* Piece indicators */}
                
              </div>

              {/* Mini preview boards - decorative */}
              <div className="absolute -top-8 -right-8 w-16 h-16 opacity-20 rotate-12 hidden xl:block">
                <div className="grid grid-cols-2 gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-3 h-3 ${i % 2 === 0 ? 'bg-primary/30' : 'bg-primary/10'}`} />
                  ))}
                </div>
              </div>
              
              <div className="absolute -bottom-8 -left-8 w-16 h-16 opacity-20 -rotate-12 hidden xl:block">
                <div className="grid grid-cols-2 gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-3 h-3 ${i % 2 === 0 ? 'bg-primary/3 0' : 'bg-primary/10'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simple scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 hidden lg:block">
          <div className="w-5 h-8 border-2 border-border rounded-full flex justify-center">
            <div className="w-1 h-2 bg-muted-foreground/30 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
} 