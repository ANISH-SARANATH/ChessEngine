import { Trophy, Users, Zap, Gift, Clock, Shield, Crown, Sparkles, Target, ChevronRight, Sword, Scroll, Brain, Flame, Coins } from 'lucide-react';

export function Tournament() {
  // TMNT-inspired color palette - only for tournament stages
  const tmntColors = {
    leo: {
      primary: 'from-blue-600 to-blue-400',
      secondary: 'bg-blue-50 dark:bg-blue-950/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 dark:bg-blue-900/30',
    },
    donnie: {
      primary: 'from-purple-600 to-purple-400',
      secondary: 'bg-purple-50 dark:bg-purple-950/20',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      icon: 'text-purple-600',
      badge: 'bg-purple-100 dark:bg-purple-900/30',
    },
    raph: {
      primary: 'from-red-600 to-red-400',
      secondary: 'bg-red-50 dark:bg-red-950/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600',
      badge: 'bg-red-100 dark:bg-red-900/30',
    },
    mikey: {
      primary: 'from-orange-600 to-orange-400',
      secondary: 'bg-orange-50 dark:bg-orange-950/20',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
      icon: 'text-orange-600',
      badge: 'bg-orange-100 dark:bg-orange-900/30',
    }
  };

  // Traditional blue for other sections
  const blueColor = {
    primary: 'from-blue-600 to-blue-400',
    secondary: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 dark:bg-blue-900/30',
  };

  const stages = [
    {
      title: 'PRE-QUALIFICATION',
      name: 'Roots & Routes',
      description: 'Cultural trivia based on chess history',
      reward: '1 Harmony Token',
      icon: Scroll,
      colorSet: 'leo',
    },
    {
      title: 'QUALIFICATION',
      name: 'Best of Three',
      description: 'Win 2 of 3 games to advance',
      reward: 'Leaderboard Points',
      icon: Sword,
      colorSet: 'donnie',
    },
    {
      title: 'POST-QUALIFICATION',
      name: 'Legends of the Board',
      description: 'Identify famous chess matches',
      reward: '1 Token + Board Choice',
      icon: Brain,
      colorSet: 'raph',
    },
    {
      title: 'KNOCKOUT',
      name: 'Finals',
      description: 'Dual-board with token advantages',
      reward: 'Championship Title',
      icon: Flame,
      colorSet: 'mikey',
    },
  ];

  const formats = [
    {
      name: 'Standard Chess',
      description: 'Classic chess format',
      duration: '10 min / 15 min',
      icon: Target,
      features: ['Classic rules', 'Time controls', 'Rating eligible'],
    },
    {
      name: 'Alternate Chess',
      description: 'Variant with custom powers',
      duration: '10 min / 15 min',
      icon: Sparkles,
      features: ['Special abilities', 'Harmony tokens', 'Unique pieces'],
    },
    {
      name: 'Modified Chess',
      description: 'Team format',
      duration: '20 min',
      icon: Shield,
      features: ['Team coordination', 'Cultural themes', 'Strategic depth'],
    },
  ];

  const tokens = [
    { tokens: 1, effect: 'Freeze opponent clock — 10 seconds' },
    { tokens: 2, effect: 'Freeze opponent clock — 20 seconds' },
    { tokens: 3, effect: 'Freeze opponent clock — 30 seconds' },
  ];

  const getColor = (set: keyof typeof tmntColors) => tmntColors[set];

  return (
    <div className="relative bg-background py-24 px-4 space-y-32">
      {/* Simple background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0.02)_0%,transparent_50%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        {/* Tournament Stages - TMNT Colors */}
        <section className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
            TOURNAMENT <span className="text-blue-600">STAGES</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Four stages. Four challenges. One champion.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
          {stages.map((stage, i) => {
            const color = getColor(stage.colorSet as keyof typeof tmntColors);
            const Icon = stage.icon;
            return (
              <div key={i} className="group relative">
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${color.primary} rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 blur-sm`} />
                <div className={`relative bg-card border-2 ${color.border} rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-300`}>
                  <div className={`w-14 h-14 ${color.badge} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon size={28} className={color.icon} />
                  </div>
                  <span className={`text-xs font-bold ${color.text} uppercase tracking-wider mb-2 block`}>
                    {stage.title}
                  </span>
                  <h3 className="text-xl font-bold text-foreground mb-2">{stage.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{stage.description}</p>
                  <div className={`inline-block ${color.badge} ${color.text} text-xs font-bold px-3 py-1.5 rounded-full`}>
                    {stage.reward}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Game Formats - Blue Theme */}
        <section className="mb-32">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
              GAME <span className="text-blue-600">FORMATS</span>
            </h2>
            <p className="text-lg text-muted-foreground">Three ways to play</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {formats.map((format, i) => {
              const Icon = format.icon;
              return (
                <div key={i} className="group relative">
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${blueColor.primary} rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 blur-sm`} />
                  <div className={`relative bg-card border-2 ${blueColor.border} rounded-2xl p-8`}>
                    <div className={`w-16 h-16 ${blueColor.badge} rounded-2xl flex items-center justify-center mb-6`}>
                      <Icon size={32} className={blueColor.icon} />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">{format.name}</h3>
                    <p className="text-muted-foreground mb-4">{format.description}</p>
                    <div className={`flex items-center gap-2 ${blueColor.text} font-bold mb-6 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-xl`}>
                      <Clock size={18} />
                      <span className="text-sm">{format.duration}</span>
                    </div>
                    <div className="space-y-2">
                      {format.features.map((feature, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className={`w-1.5 h-1.5 rounded-full bg-blue-600`} />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Harmony Token System - Blue Theme with Coins */}
        <section className="mb-32">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
              HARMONY <span className="text-blue-600">TOKENS</span>
            </h2>
            <p className="text-lg text-muted-foreground">Maximum 3 tokens per player</p>
          </div>

          <div className={`bg-card border-2 ${blueColor.border} rounded-3xl p-8 md:p-12`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {tokens.map((token, i) => (
                <div key={i} className="text-center">
                  <div className="relative inline-block mb-4">
                    <div className={`w-20 h-20 ${blueColor.badge} rounded-full flex items-center justify-center mx-auto border-2 ${blueColor.border} shadow-lg`}>
                      <Coins size={36} className={blueColor.icon} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                      {token.tokens}
                    </div>
                  </div>
                  <p className="text-lg font-bold text-foreground">{token.effect}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-10 pt-8 border-t border-blue-200 dark:border-blue-800 text-center">
              <p className="text-sm text-muted-foreground">
                Earn tokens through victories and trivia challenges
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
