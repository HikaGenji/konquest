import type { Hero } from '../engine';

interface Props {
  hero: Hero;
  selected?: boolean;
  taken?: boolean;
  accent?: string;
  onClick?: () => void;
}

export function HeroCard({ hero, selected, taken, accent, onClick }: Props) {
  return (
    <div
      className={`hero-card${selected ? ' selected' : ''}${taken ? ' taken' : ''}`}
      style={accent ? ({ ['--c' as string]: accent }) : undefined}
      onClick={taken ? undefined : onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="hero-emoji">{hero.emoji}</div>
      <div className="hero-text">
        <div className="hero-name">{hero.name}</div>
        <div className="hero-title">{hero.title}</div>
        <div className="hero-blurb">{hero.blurb}</div>
      </div>
    </div>
  );
}
