import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { ChevronLeft, Sparkles, Zap, Sword, Coins, Crown, Users, Shield, Gift, Flame } from 'lucide-react'

export default function GameRules() {
  // Mikey (Orange) theme - all powers use Mikey colors
  const mikeyTheme = {
    primary: 'from-orange-500 to-orange-400',
    card: 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20',
    badge: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    icon: 'text-orange-600',
    button: 'bg-orange-600',
    border: 'border-orange-200 dark:border-orange-800',
  };

  const powers = [
    {
      name: 'Buddhist Monk',
      piece: 'Bishop',
      pieceSymbol: 'B',
      icon: Sparkles,
      power: 'Convert',
      description: 'When this piece moves, any enemy pawn adjacent (orthogonally or diagonally) to its destination square is converted to your side.',
    },
    {
      name: 'Sikh Warrior',
      piece: 'Knight',
      pieceSymbol: 'N',
      icon: Sword,
      power: 'Leap',
      description: 'Once per game, this piece can jump over an adjacent friendly piece to land on the other side, capturing any enemy piece on the destination square.',
    },
    {
      name: 'Parsi Merchant',
      piece: 'Rook',
      pieceSymbol: 'R',
      icon: Coins,
      power: 'Trade',
      description: 'This piece can trade positions with any adjacent friendly piece (Pawn, Monk, Warrior, Keeper, etc.). This counts as a move.',
    },
    {
      name: 'Nasrani Keeper',
      piece: 'Queen',
      pieceSymbol: 'Q',
      icon: Crown,
      power: 'Resurrection',
      description: 'If captured, this piece returns to its starting square on your next turn (only once per game). If the square is occupied, resurrection is delayed until it becomes empty.',
    },
  ];

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
            {/* Badge - Orange theme */}
            <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-full mb-6">
              <Flame size={16} />
              <span className="text-sm font-semibold">Powers Format</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-black text-foreground mb-4 tracking-tight">
              SPECIAL <span className="text-orange-600 dark:text-orange-400">POWERS</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Master the unique abilities of each cultural piece in the Powers format
            </p>
          </div>

          {/* Powers Grid - 2x2 with equal height cards - All Orange */}
          <div className="grid md:grid-cols-2 gap-6 mb-12 auto-rows-fr">
            {powers.map((power, index) => {
              const Icon = power.icon;
              return (
                <div key={index} className="relative h-full">
                  
                  
                  
                  {/* Card - Orange theme */}
                  <Card className={`relative border-2 ${mikeyTheme.card} ${mikeyTheme.border} rounded-2xl overflow-hidden h-full flex flex-col`}>
                    {/* Top accent bar - Orange gradient */}
                    <div className={`h-2 w-full bg-gradient-to-r ${mikeyTheme.primary}`} />
                    
                    <CardHeader className="flex-shrink-0">
                      <div className="flex items-start justify-between">
                        <div>
                          {/* Piece badge - Orange */}
                          <div className={`inline-block ${mikeyTheme.badge} ${mikeyTheme.text} text-xs font-bold px-3 py-1 rounded-full mb-3`}>
                            {power.piece}
                          </div>
                          <CardTitle className="text-2xl font-bold text-foreground">
                            {power.name}
                          </CardTitle>
                          {/* Piece symbol display - Orange */}
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-sm text-muted-foreground">Plays as:</span>
                            <span className={`text-2xl ${mikeyTheme.text}`}>{power.pieceSymbol}</span>
                          </div>
                        </div>
                        {/* Icon container - Orange */}
                        <div className={`w-14 h-14 ${mikeyTheme.badge} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon size={28} className={mikeyTheme.icon} />
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4 flex-1 flex flex-col">
                      {/* Power name - Orange */}
                      <div className="flex items-center gap-2">
                        <Zap size={16} className={mikeyTheme.icon} />
                        <span className={`font-bold ${mikeyTheme.text}`}>{power.power}</span>
                      </div>
                      
                      {/* Description */}
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                        {power.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Back to Game Button - Orange */}
          <div className="text-center">
            <Link to="/game">
              <Button className="bg-orange-600 text-white px-8 py-6 rounded-full font-bold text-lg shadow-lg">
                Back to Formats
              </Button>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Choose Powers format from the game selection screen
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}



