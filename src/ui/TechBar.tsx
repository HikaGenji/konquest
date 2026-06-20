import { AGES, ageIndex, MAX_TECH } from '../engine';
import type { PlayerState } from '../engine';

/** Graphical six-age progression with offense/defense track meters. */
export function TechBar({ player }: { player: PlayerState }) {
  const idx = ageIndex(player.offense, player.defense);

  return (
    <div className="techbar">
      <div className="ages">
        {AGES.map((a, i) => (
          <div
            key={a.name}
            className={`age-cell${i === idx ? ' on' : ''}${i < idx ? ' done' : ''}`}
            style={{ ['--ac' as string]: a.color }}
            title={a.name}
          >
            <span className="age-ico">{a.icon}</span>
            <span className="age-nm">{a.name}</span>
          </div>
        ))}
      </div>
      <div className="tech-tracks">
        <div className="track">
          <span className="tk">⚔️ Weapons</span>
          <div className="bar">
            <i style={{ width: `${(player.offense / MAX_TECH) * 100}%`, background: '#f87171' }} />
          </div>
          <b>L{player.offense}</b>
        </div>
        <div className="track">
          <span className="tk">🛡️ Defenses</span>
          <div className="bar">
            <i style={{ width: `${(player.defense / MAX_TECH) * 100}%`, background: '#60a5fa' }} />
          </div>
          <b>L{player.defense}</b>
        </div>
      </div>
    </div>
  );
}
