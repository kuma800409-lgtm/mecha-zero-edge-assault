import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { gameNetworking } from '../utils/networking';
import { MechType, MECH_CONFIGS, WeaponType, WEAPON_CONFIGS } from '../types/game';

export function Lobby() {
  const {
    playerName,
    selectedMech,
    selectedWeapon,
    isConnected,
    isMatchmaking,
    queuePosition,
    estimatedWait,
    setPlayerName,
    setSelectedMech,
    setSelectedWeapon,
  } = useGameStore();

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    connectToServer();
  }, []);

  const connectToServer = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      await gameNetworking.connectToMatchmaker();
    } catch (error) {
      setConnectionError('Failed to connect to server. Please try again.');
      console.error('Connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleQuickMatch = () => {
    if (!isConnected) {
      connectToServer();
      return;
    }
    gameNetworking.quickMatch(playerName, selectedMech);
  };

  const handleCancelQueue = () => {
    gameNetworking.cancelQueue();
  };

  const mechTypes: MechType[] = ['stalker', 'griffin', 'leo'];
  const weaponTypes: WeaponType[] = ['kinetic', 'energy', 'explosive'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0wLTZoLTJWMTJoMnY0em0wLTZoLTJWNmgydjR6bTAtNmgtMlYwaDJ2NHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            MECHA-ZERO
          </h1>
          <h2 className="text-2xl md:text-3xl font-light text-gray-400">
            EDGE ASSAULT 3D
          </h2>
          <p className="mt-4 text-gray-500">
            Third-Person Shooter | PVP Multiplayer | 100 Players
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-cyan-400">Player Setup</h3>
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Callsign</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="Enter your callsign"
                maxLength={20}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-4">Select Mech</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mechTypes.map((type) => {
                  const config = MECH_CONFIGS[type];
                  const isSelected = selectedMech === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedMech(type)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-gray-600 bg-gray-900/50 hover:border-gray-500'
                      }`}
                    >
                      <div
                        className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-3xl"
                        style={{ backgroundColor: config.color + '33' }}
                      >
                        {type === 'stalker' ? '🥷' : type === 'griffin' ? '🦅' : '🛡️'}
                      </div>
                      <h4 className="font-bold text-lg" style={{ color: config.color }}>
                        {config.name}
                      </h4>
                      <p className="text-sm text-gray-400 mt-1">{config.description}</p>
                      <div className="mt-3 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Health:</span>
                          <span>{config.maxHealth}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shield:</span>
                          <span>{config.maxShield}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Speed:</span>
                          <span>{config.speed}</span>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-gray-800 rounded-lg">
                        <div className="text-xs text-purple-400 font-semibold">
                          {config.abilityName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {config.abilityDescription}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-4">Select Weapon</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {weaponTypes.map((type) => {
                  const config = WEAPON_CONFIGS[type];
                  const isSelected = selectedWeapon === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedWeapon(type)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-gray-600 bg-gray-900/50 hover:border-gray-500'
                      }`}
                    >
                      <div
                        className="w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: config.color + '33' }}
                      >
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                      </div>
                      <h4 className="font-bold" style={{ color: config.color }}>
                        {config.name}
                      </h4>
                      <div className="mt-2 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Damage:</span>
                          <span>{config.damage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ammo:</span>
                          <span>{config.maxAmmo}</span>
                        </div>
                        {config.aoeRadius > 0 && (
                          <div className="flex justify-between text-orange-400">
                            <span>AoE:</span>
                            <span>{config.aoeRadius}m</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-cyan-400">Battle Arena</h3>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-400">
                  {isConnecting
                    ? 'Connecting...'
                    : isConnected
                    ? 'Connected'
                    : 'Disconnected'}
                </span>
              </div>
            </div>

            {connectionError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                {connectionError}
                <button
                  onClick={connectToServer}
                  className="ml-2 underline hover:text-red-300"
                >
                  Retry
                </button>
              </div>
            )}

            {isMatchmaking ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <h4 className="text-xl font-semibold mb-2">Finding Match...</h4>
                <p className="text-gray-400 mb-4">
                  Queue Position: {queuePosition} | Est. Wait: {estimatedWait}s
                </p>
                <button
                  onClick={handleCancelQueue}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="text-center">
                <button
                  onClick={handleQuickMatch}
                  disabled={isConnecting || !playerName.trim()}
                  className="w-full md:w-auto px-12 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 rounded-xl font-bold text-xl transition-all transform hover:scale-105 disabled:hover:scale-100"
                >
                  {isConnecting ? 'CONNECTING...' : 'QUICK MATCH'}
                </button>
                <p className="mt-4 text-sm text-gray-500">
                  Join a random match with other players
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm text-gray-500">
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="text-2xl mb-2">🎮</div>
              <div className="font-semibold text-gray-300">WASD + Mouse</div>
              <div>Movement & Aim</div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="text-2xl mb-2">🖱️</div>
              <div className="font-semibold text-gray-300">Left Click</div>
              <div>Fire Weapon</div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="text-2xl mb-2">⌨️</div>
              <div className="font-semibold text-gray-300">Spacebar</div>
              <div>Use Ability</div>
            </div>
          </div>
        </div>

        <footer className="mt-12 text-center text-gray-600 text-sm">
          <p>Mecha-Zero Edge Assault 3D | Multiplayer TPS</p>
          <p className="mt-1">Powered by Three.js + Cloudflare Durable Objects</p>
        </footer>
      </div>
    </div>
  );
}
