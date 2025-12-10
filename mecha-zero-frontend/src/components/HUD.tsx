import { useGameStore } from '../store/gameStore';
import { MECH_CONFIGS, WEAPON_CONFIGS } from '../types/game';

export function HUD() {
  const {
    playerId,
    playerName,
    team,
    players,
    teamAScore,
    teamBScore,
    gamePhase,
  } = useGameStore();

  const localPlayer = playerId ? players.get(playerId) : null;

  if (gamePhase === 'lobby' || gamePhase === 'matchmaking') {
    return null;
  }

  if (!localPlayer) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 text-white">
        <div className="text-2xl">Connecting to game...</div>
      </div>
    );
  }

  const mechConfig = MECH_CONFIGS[localPlayer.mechType];
  const weaponConfig = WEAPON_CONFIGS[localPlayer.weaponType];
  const healthPercent = (localPlayer.health / localPlayer.maxHealth) * 100;
  const shieldPercent = (localPlayer.shield / localPlayer.maxShield) * 100;
  const ammoPercent = (localPlayer.ammo / localPlayer.maxAmmo) * 100;
  const cooldownPercent = Math.max(0, 100 - (localPlayer.abilityCooldown / mechConfig.abilityCooldown) * 100);

  return (
    <div className="fixed inset-0 pointer-events-none text-white font-mono">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-black/60 px-6 py-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full" />
          <span className="text-2xl font-bold text-red-400">Team A</span>
          <span className="text-3xl font-bold">{teamAScore}</span>
        </div>
        <div className="text-xl text-gray-400">VS</div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold">{teamBScore}</span>
          <span className="text-2xl font-bold text-blue-400">Team B</span>
          <div className="w-4 h-4 bg-blue-500 rounded-full" />
        </div>
      </div>

      <div className="absolute top-4 left-4 bg-black/60 px-4 py-2 rounded-lg">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: team === 'teamA' ? '#ff4444' : '#4444ff' }}
          />
          <span className="text-lg font-bold">{playerName}</span>
        </div>
        <div className="text-sm text-gray-400">
          {mechConfig.name} | {team === 'teamA' ? 'Team A' : 'Team B'}
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-black/60 px-4 py-2 rounded-lg text-right">
        <div className="text-lg">
          <span className="text-green-400">{localPlayer.kills}</span>
          <span className="text-gray-400"> / </span>
          <span className="text-red-400">{localPlayer.deaths}</span>
        </div>
        <div className="text-sm text-gray-400">K / D</div>
      </div>

      <div className="absolute bottom-4 left-4 w-80 bg-black/60 p-4 rounded-lg">
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Health</span>
            <span>{Math.round(localPlayer.health)} / {localPlayer.maxHealth}</span>
          </div>
          <div className="h-4 bg-gray-800 rounded overflow-hidden">
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${healthPercent}%`,
                backgroundColor: healthPercent > 30 ? '#22c55e' : '#ef4444',
              }}
            />
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Shield</span>
            <span>{Math.round(localPlayer.shield)} / {localPlayer.maxShield}</span>
          </div>
          <div className="h-3 bg-gray-800 rounded overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-200"
              style={{ width: `${shieldPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: mechConfig.color }}
          />
          <span>{mechConfig.name}</span>
          {localPlayer.abilityActive && (
            <span className="text-yellow-400 animate-pulse">
              {mechConfig.abilityName} ACTIVE
            </span>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 w-64 bg-black/60 p-4 rounded-lg">
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>{weaponConfig.name}</span>
            <span>{localPlayer.ammo} / {localPlayer.maxAmmo}</span>
          </div>
          <div className="h-3 bg-gray-800 rounded overflow-hidden">
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${ammoPercent}%`,
                backgroundColor: weaponConfig.color,
              }}
            />
          </div>
          {localPlayer.reloading && (
            <div className="text-yellow-400 text-sm mt-1 animate-pulse">
              RELOADING...
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>{mechConfig.abilityName}</span>
            <span>{localPlayer.abilityCooldown > 0 ? `${Math.ceil(localPlayer.abilityCooldown / 1000)}s` : 'READY'}</span>
          </div>
          <div className="h-3 bg-gray-800 rounded overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-200"
              style={{ width: `${cooldownPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-lg text-center">
        <div className="text-xs text-gray-400 mb-1">CONTROLS</div>
        <div className="text-sm">
          <span className="text-gray-300">WASD</span> Move |{' '}
          <span className="text-gray-300">Mouse</span> Aim |{' '}
          <span className="text-gray-300">Click</span> Shoot |{' '}
          <span className="text-gray-300">Space</span> Ability
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-8 h-8">
          <div className="absolute top-1/2 left-0 w-3 h-0.5 bg-white/80 -translate-y-1/2" />
          <div className="absolute top-1/2 right-0 w-3 h-0.5 bg-white/80 -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 w-0.5 h-3 bg-white/80 -translate-x-1/2" />
          <div className="absolute left-1/2 bottom-0 w-0.5 h-3 bg-white/80 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>

      {!localPlayer.isAlive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <div className="text-4xl font-bold text-red-500 mb-4">DESTROYED</div>
            <div className="text-xl text-gray-300">Respawning...</div>
          </div>
        </div>
      )}

      {gamePhase === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <div className="text-6xl font-bold text-yellow-400 animate-pulse">
              GET READY
            </div>
            <div className="text-2xl text-gray-300 mt-4">
              Game starting soon...
            </div>
          </div>
        </div>
      )}

      {gamePhase === 'ended' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <div className="text-5xl font-bold mb-4">
              {teamAScore > teamBScore ? (
                <span className="text-red-400">TEAM A WINS!</span>
              ) : teamBScore > teamAScore ? (
                <span className="text-blue-400">TEAM B WINS!</span>
              ) : (
                <span className="text-yellow-400">DRAW!</span>
              )}
            </div>
            <div className="text-3xl mb-6">
              <span className="text-red-400">{teamAScore}</span>
              <span className="text-gray-400"> - </span>
              <span className="text-blue-400">{teamBScore}</span>
            </div>
            <div className="text-xl text-gray-300">
              Your Stats: {localPlayer.kills} Kills / {localPlayer.deaths} Deaths
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
