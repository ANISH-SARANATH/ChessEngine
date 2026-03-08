import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Clock, Zap, Sword, Users, Target, Shield, ChevronRight } from 'lucide-react'

export default function CommonRules() {
  const [searchParams] = useSearchParams()
  const format = searchParams.get('format') || 'blitz'

  const formatConfig = {
    blitz: { name: 'Blitz', time: 'Admin controlled', icon: Zap, color: 'from-red-600 to-red-400', textColor: 'text-red-600 dark:text-red-400' },
    rapid: { name: 'Rapid', time: 'Admin controlled', icon: Clock, color: 'from-purple-600 to-purple-400', textColor: 'text-purple-600 dark:text-purple-400' },
  }

  const config = formatConfig[format as keyof typeof formatConfig]
  const Icon = config.icon

  const rules = [
    {
      title: 'Basic Rules',
      items: [
        'White moves first, then players alternate turns',
        'Move one piece per turn (except castling)',
        'Pieces cannot move through other pieces (except knights)',
        'A piece is captured when landing on an opponent\'s square',
      ]
    },
    {
      title: 'Check & Checkmate',
      items: [
        'Check: Your king is under attack',
        'You must get out of check immediately',
        'Checkmate: King cannot escape check - game over',
        'Stalemate: No legal moves but not in check - draw',
      ]
    },
    {
      title: 'Special Moves',
      items: [
        'Castling: Move king and rook in one turn',
        'En passant: Special pawn capture',
        'Pawn promotion: Pawn becomes queen/rook/bishop/knight',
      ]
    },
    {
      title: 'Game Endings',
      items: [
        'Checkmate - Win',
        'Stalemate - Draw',
        'Insufficient material - Draw',
        'Threefold repetition - Draw',
        '50-move rule - Draw',
      ]
    },
  ]

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
              Back to Formats
            </button>
          </Link>

          {/* Format Badge */}
          <div className="flex justify-center mb-8">
            <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${config.color} text-white px-6 py-3 rounded-full shadow-lg`}>
              <Icon size={20} />
              <span className="font-bold">{config.name}</span>
              <span className="text-white/80 text-sm">â€¢</span>
              <span className="text-sm">{config.time}</span>
            </div>
          </div>

          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl sm:text-6xl font-black text-foreground mb-4 tracking-tight">
              CHESS <span className={config.textColor}>RULES</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Quick refresher on standard chess rules for {config.name} format
            </p>
          </div>

          {/* Rules Grid - 2x2 */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {rules.map((section, index) => (
              <Card key={index} className="border-2 border-border rounded-2xl overflow-hidden">
                <div className={`h-2 w-full bg-gradient-to-r ${config.color}`} />
                <CardHeader>
                  <CardTitle className="text-2xl text-foreground">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${config.color.replace('from-', 'bg-').split(' ')[0]}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/game">
              <Button className={`bg-gradient-to-r ${config.color} text-white px-8 py-6 rounded-full font-bold text-lg min-w-[200px] flex items-center gap-2`}>
                <span>Back to Formats</span>
                <ChevronRight size={18} />
              </Button>
            </Link>
            <Link to="/game">
              <Button variant="outline" className="border-2 px-8 py-6 rounded-full font-bold text-lg min-w-[200px]">
                Choose Different Format
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

