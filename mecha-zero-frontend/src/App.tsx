import { useGameStore } from './store/gameStore';
import { Lobby } from './components/Lobby';
import { GameScene } from './components/GameScene';

function App() {
  const { gamePhase } = useGameStore();

  if (gamePhase === 'lobby' || gamePhase === 'matchmaking') {
    return <Lobby />;
  }

  return <GameScene />;
}

export default App;
