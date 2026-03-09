import { Route, Routes } from 'react-router-dom';

import { GameProvider } from '@/context/game-context';
import Home from '@/pages/Home';
import GameFormats from '@/pages/GameFormats';
import GameSetup from '@/pages/GameSetup';
import GamePlay from '@/pages/GamePlay';
import GameRules from '@/pages/GameRules';
import GameCommonRules from '@/pages/GameCommonRules';
import GameHarmonyRules from '@/pages/GameHarmonyRules';
import AdminPage from '@/pages/Admin';
import LeaderboardPage from '@/pages/Leaderboard';

function App() {
  return (
    <GameProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<GameFormats />} />
        <Route path="/game/setup" element={<GameSetup />} />
        <Route path="/game/play" element={<GamePlay />} />
        <Route path="/game/rules" element={<GameRules />} />
        <Route path="/game/common-rules" element={<GameCommonRules />} />
        <Route path="/game/harmony-rules" element={<GameHarmonyRules />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </GameProvider>
  );
}

export default App;


