import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Flame, Sparkles, Swords, Wand2, Zap, Users } from 'lucide-react';
import { bootstrapPlayer } from '@/lib/api';

const TEAM_NAME_KEY = 'chess_team_name';
const PLAYER_KEY = 'chess_player';

export default function GameFormats() {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [hasIdentity, setHasIdentity] = useState(false);
  const [joiningQueue, setJoiningQueue] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedName = sessionStorage.getItem(TEAM_NAME_KEY) ?? '';
    const savedPlayer = sessionStorage.getItem(PLAYER_KEY);
    if (savedName && savedPlayer) {
      setTeamName(savedName);
      setHasIdentity(true);
    }
  }, []);

  const saveName = async () => {
    const clean = teamName.trim();
    if (!clean) {
      return;
    }
    setSavingName(true);
    setError(null);
    try {
      const player = await bootstrapPlayer(clean);
      sessionStorage.setItem(TEAM_NAME_KEY, clean);
      sessionStorage.setItem(PLAYER_KEY, JSON.stringify({ id: player.id, name: player.name }));
      setHasIdentity(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save name');
    } finally {
      setSavingName(false);
    }
  };

  const continueToQueue = async () => {
    if (!hasIdentity) {
      return;
    }
    setJoiningQueue(true);
    setError(null);
    try {
      const savedName = sessionStorage.getItem(TEAM_NAME_KEY) ?? teamName;
      const savedPlayer = sessionStorage.getItem(PLAYER_KEY);
      const parsed = savedPlayer ? (JSON.parse(savedPlayer) as { id?: string; name?: string }) : {};
      const player = await bootstrapPlayer(savedName, parsed.id);
      sessionStorage.setItem(PLAYER_KEY, JSON.stringify({ id: player.id, name: player.name }));
      navigate('/game/play');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to join queue');
    } finally {
      setJoiningQueue(false);
    }
  };

  const tmntColors = {
    leo: {
      primary: 'from-blue-600 to-blue-400',
      card: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20',
      badge: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700',
      icon: 'text-blue-600',
      border: 'border-blue-200 dark:border-blue-800',
    },
    donnie: {
      primary: 'from-purple-600 to-purple-400',
      card: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20',
      badge: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
      button: 'bg-purple-600 hover:bg-purple-700',
      icon: 'text-purple-600',
      border: 'border-purple-200 dark:border-purple-800',
    },
    raph: {
      primary: 'from-red-600 to-red-400',
      card: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20',
      badge: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700',
      icon: 'text-red-600',
      border: 'border-red-200 dark:border-red-800',
    },
    mikey: {
      primary: 'from-orange-600 to-orange-400',
      card: 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20',
      badge: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      button: 'bg-orange-600 hover:bg-orange-700',
      icon: 'text-orange-600',
      border: 'border-orange-200 dark:border-orange-800',
    },
  };

  const formats = [
    {
      id: 'blitz',
      name: 'Blitz',
      tagline: 'Lightning Fast',
      description: 'Fast-paced games perfect for quick matches',
      details: 'Normal chess. Timer is controlled by backend/admin settings.',
      icon: Zap,
      features: ['Quick decision making', 'Intense gameplay', 'Perfect for practice'],
      colorSet: 'raph',
      route: '/game/common-rules?format=blitz',
      ruleType: 'common',
    },
    {
      id: 'rapid',
      name: 'Rapid',
      tagline: 'Strategic Depth',
      description: 'Balanced games with thoughtful play',
      details: 'Normal chess. Timer is controlled by backend/admin settings.',
      icon: Clock,
      features: ['Careful planning', 'Deep strategy', 'Classic experience'],
      colorSet: 'donnie',
      route: '/game/common-rules?format=rapid',
      ruleType: 'common',
    },
    {
      id: 'powers',
      name: 'Powers',
      tagline: 'Unique Abilities',
      description: 'Master unique piece abilities and special powers',
      details: 'Modified chess with piece powers and single-use abilities.',
      icon: Wand2,
      features: ['Special abilities', 'Tactical environment', 'Cultural pieces'],
      colorSet: 'mikey',
      route: '/game/rules',
      ruleType: 'powers',
    },
    {
      id: 'knockout',
      name: 'Knockout',
      tagline: 'Token Strategy',
      description: 'Normal chess with Harmony Token pressure',
      details: 'Harmony Tokens are active and tracked by the backend.',
      icon: Flame,
      features: ['Time burning', 'Harmony Tokens', 'Tournament ready'],
      colorSet: 'leo',
      route: '/game/harmony-rules?format=knockout',
      ruleType: 'harmony',
    },
  ] as const;

  const getColor = (set: keyof typeof tmntColors) => tmntColors[set];

  const getBadgeText = (format: (typeof formats)[number]) => {
    switch (format.ruleType) {
      case 'common':
        return 'Learn Rules';
      case 'powers':
        return 'Learn Powers';
      case 'harmony':
        return 'Learn Tokens';
      default:
        return 'Learn Rules';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0.02)_0%,transparent_50%)] pointer-events-none" />

      <Header />
      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          {!hasIdentity && (
            <Card className="max-w-xl mx-auto mb-10 border border-slate-200 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Users size={22} className="text-blue-600" />
                  Enter Team Name
                </CardTitle>
                <CardDescription>Enter your team name first, then read formats and continue to queue.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  maxLength={40}
                  className="w-full px-4 py-3 border rounded-xl bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Team name"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button onClick={saveName} disabled={!teamName.trim() || savingName} className="w-full bg-blue-600 text-white hover:bg-blue-700">
                  {savingName ? 'Saving...' : 'Save Name'}
                </Button>
              </CardContent>
            </Card>
          )}

          {hasIdentity && (
            <>
              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground">
                  Team: <span className="font-semibold text-blue-600">{teamName}</span>
                </p>
              </div>

              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
                  <Sparkles size={16} />
                  <span className="text-sm font-semibold">Choose Your Battle</span>
                </div>

                <h1 className="text-5xl sm:text-6xl font-black text-foreground mb-4 tracking-tight">
                  GAME <span className="text-primary">FORMATS</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Read rules, then click Continue to Queue at bottom.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-12">
                {formats.map((format) => {
                  const color = getColor(format.colorSet);
                  const Icon = format.icon;
                  const badgeText = getBadgeText(format);

                  return (
                    <div key={format.id} className="relative">
                      <Card className={`relative border-2 ${color.card} ${color.border} rounded-2xl overflow-hidden`}>
                        <div className={`h-2 w-full bg-gradient-to-r ${color.primary}`} />

                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className={`inline-block ${color.badge} ${color.text} text-xs font-bold px-3 py-1 rounded-full mb-3`}>{format.tagline}</div>
                              <CardTitle className="text-3xl font-bold text-foreground">{format.name}</CardTitle>
                            </div>
                            <div className={`w-14 h-14 ${color.badge} rounded-xl flex items-center justify-center`}>
                              <Icon size={28} className={color.icon} />
                            </div>
                          </div>
                          <CardDescription className="text-base text-muted-foreground">{format.description}</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                          <p className="text-sm text-muted-foreground">{format.details}</p>

                          <div className="space-y-2">
                            {format.features.map((feature, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className={`w-1.5 h-1.5 rounded-full ${color.icon}`} />
                                {feature}
                              </div>
                            ))}
                          </div>

                          <Link to={format.route} className="block">
                            <Button className={`w-full ${color.button} text-white font-bold py-6 rounded-xl gap-2`}>
                              <Swords size={18} />
                              {badgeText}
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
                <Button onClick={continueToQueue} disabled={joiningQueue} className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-6 text-lg rounded-xl">
                  {joiningQueue ? 'Joining Queue...' : 'Continue to Queue'}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
