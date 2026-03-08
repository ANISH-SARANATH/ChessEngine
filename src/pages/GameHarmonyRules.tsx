import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Coins, Zap, Clock, Trophy, Sparkles, Sword, Flame, Timer, Users } from 'lucide-react'

export default function HarmonyRules() {
  const [searchParams] = useSearchParams()
  const format = searchParams.get('format') || 'knockout'

  // TMNT-inspired color palette - Knockout uses Leo (Blue)
  const tmntColors = {
    leo: {
      primary: 'from-blue-600 to-blue-400',
      card: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20',
      badge: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      icon: 'text-blue-600',
      button: 'bg-blue-600',
      border: 'border-blue-200 dark:border-blue-800',
    },
    donnie: {
      primary: 'from-purple-600 to-purple-400',
      card: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20',
      badge: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
      icon: 'text-purple-600',
      button: 'bg-purple-600',
      border: 'border-purple-200 dark:border-purple-800',
    },
    raph: {
      primary: 'from-red-600 to-red-400',
      card: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20',
      badge: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      icon: 'text-red-600',
      button: 'bg-red-600',
      border: 'border-red-200 dark:border-red-800',
    },
    mikey: {
      primary: 'from-orange-600 to-orange-400',
      card: 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20',
      badge: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      icon: 'text-orange-600',
      button: 'bg-orange-600',
      border: 'border-orange-200 dark:border-orange-800',
    }
  };

  // All features use Leo (Blue) for Knockout consistency
  const tokenFeatures = [
    {
      title: 'Earn Tokens',
      description: 'Win matches and complete trivia challenges to earn Harmony Tokens',
      icon: Trophy,
      colorSet: 'leo',
    },
    {
      title: 'Strategic Advantage',
      description: 'Use tokens to freeze your opponent\'s clock and gain a time advantage',
      icon: Zap,
      colorSet: 'leo',
    },
    {
      title: 'Token Tiers',
      description: '1 token = 10s freeze â€¢ 2 tokens = 20s freeze â€¢ 3 tokens = 30s freeze',
      icon: Timer,
      colorSet: 'leo',
    },
    {
      title: 'Maximum Limit',
      description: 'Players can never hold more than 3 Harmony Tokens at any time',
      icon: Coins,
      colorSet: 'leo',
    },
  ];

  const tokenTiers = [
    { tokens: 1, time: '10 seconds', color: 'from-blue-600 to-blue-400' },
    { tokens: 2, time: '20 seconds', color: 'from-blue-600 to-blue-400' },
    { tokens: 3, time: '30 seconds', color: 'from-blue-600 to-blue-400' },
  ];

  const getColor = (set: keyof typeof tmntColors) => tmntColors[set];
  const leo = tmntColors.leo;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0.02)_0%,transparent_50%)] pointer-events-none" />
      
      <Header />
      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8 relative">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Link to="/game">
            <button className="flex items-center gap-2 text-muted-foreground mb-8">
              <ChevronLeft size={20}  />
              Back to Game
            </button>
          </Link>

          {/* Header Section */}
          <div className="text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full mb-6">
              <Coins size={16} />
              <span className="text-sm font-semibold">Knockout Format</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-black text-foreground mb-4 tracking-tight">
              HARMONY <span className="text-blue-600 dark:text-blue-400">TOKENS</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Strategic advantages that can turn the tide of battle
            </p>
          </div>

          {/* Token Overview Card - Using Leo colors */}
          <Card className={`border-2 ${leo.border} rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-blue-600/5 to-transparent`}>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className={`w-24 h-24 ${leo.badge} rounded-3xl flex items-center justify-center`}>
                  <Coins size={48} className={leo.icon} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-foreground mb-2">What are Harmony Tokens?</h3>
                  <p className="text-muted-foreground">
                    Harmony Tokens are special resources you earn through victories and trivia challenges. 
                    Use them strategically in Knockout matches to freeze your opponent's clock and gain a critical time advantage.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Token Features Grid - 2x2 - All Leo now */}
          <div className="grid md:grid-cols-2 gap-6 mb-12 auto-rows-fr">
            {tokenFeatures.map((feature, index) => {
              const color = getColor(feature.colorSet as keyof typeof tmntColors);
              const Icon = feature.icon;
              return (
                <div key={index} className="relative h-full">
                  {/* Hover glow effect */}
                  
                  
                  <Card className={`relative border-2 ${color.card} ${color.border} rounded-2xl overflow-hidden h-full`}>
                    {/* Top accent bar */}
                    <div className={`h-2 w-full bg-gradient-to-r ${color.primary}`} />
                    
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 ${color.badge} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon size={28} className={color.icon} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Token Tiers Section - All Blue now */}
          <h2 className="text-3xl font-bold text-foreground text-center mb-8">Token Tiers</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {tokenTiers.map((tier, index) => (
              <Card key={index} className={`border-2 ${leo.border} rounded-2xl overflow-hidden text-center`}>
                <div className={`h-2 w-full bg-gradient-to-r ${tier.color}`} />
                <CardContent className="p-6">
                  <div className={`w-16 h-16 ${leo.badge} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <span className={`text-2xl font-bold ${leo.text}`}>{tier.tokens}</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground mb-2">{tier.tokens} Token{tier.tokens > 1 ? 's' : ''}</p>
                  <p className={`text-lg ${leo.text} font-semibold mb-4`}>{tier.time} Freeze</p>
                  <p className="text-sm text-muted-foreground">
                    Freeze opponent's clock for {tier.time}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* How to Use Section - Leo */}
          <Card className={`border-2 ${leo.border} rounded-2xl overflow-hidden mb-8`}>
            <div className={`h-2 w-full bg-gradient-to-r ${leo.primary}`} />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Zap className={leo.icon} size={24} />
                How to Use Tokens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 ${leo.badge} rounded-full flex items-center justify-center text-sm font-bold ${leo.text} flex-shrink-0 mt-0.5`}>1</div>
                <div>
                  <p className="font-semibold text-foreground">Earn Tokens</p>
                  <p className="text-sm text-muted-foreground">Win matches and complete trivia challenges in the tournament</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 ${leo.badge} rounded-full flex items-center justify-center text-sm font-bold ${leo.text} flex-shrink-0 mt-0.5`}>2</div>
                <div>
                  <p className="font-semibold text-foreground">During Your Turn</p>
                  <p className="text-sm text-muted-foreground">Click the token button to activate and freeze opponent's clock</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 ${leo.badge} rounded-full flex items-center justify-center text-sm font-bold ${leo.text} flex-shrink-0 mt-0.5`}>3</div>
                <div>
                  <p className="font-semibold text-foreground">Strategic Timing</p>
                  <p className="text-sm text-muted-foreground">Use tokens when your opponent is low on time for maximum impact</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/game">
              <Button className={`${leo.button} text-white px-8 py-6 rounded-full font-bold text-lg min-w-[200px]`}>
                Back to Formats
              </Button>
            </Link>
            <Link to="/game/rules">
              <Button variant="outline" className={`border-2 ${leo.border} ${leo.text} px-8 py-6 rounded-full font-bold text-lg min-w-[200px]`}>
                View Powers Rules
              </Button>
            </Link>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Master the token system to dominate in Knockout matches
          </p>
        </div>
      </main>
    </div>
  )
}


