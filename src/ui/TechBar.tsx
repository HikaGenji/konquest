import { AGES, ageIndex, MAX_TECH } from '../engine';
import type { PlayerState } from '../engine';

/** Graphical six-age progression with offense/defense/industry track meters. */
export function TechBar({ player }: { player: PlayerState }) {
  const idx = ageIndex(player.offense, player.defense, player.industry);

  const tracks: { label: string; level: number; color: string }[] = [
    { label: '⚔️ Weapons', level: player.offense, color: '#f87171' },
    { label: '🛡️ Defenses', level: player.defense, color: '#60a5fa' },
    { label: '🏭 Industry', level: player.industry, color: '#34d399' },
  ];

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
        {tracks.map((t) => (
          <div className="track" key={t.label}>
            <span className="tk">{t.label}</span>
            <div className="bar">
              <i style={{ width: `${(t.level / MAX_TECH) * 100}%`, background: t.color }} />
            </div>
            <b>L{t.level}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
