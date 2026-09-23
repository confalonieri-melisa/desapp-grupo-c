import styles from "./PlayerCardRating.module.scss";

interface PlayerCardRatingProps {
  rating: number | undefined;
}

export default function PlayerCardRating({ rating }: PlayerCardRatingProps) {
  const displayedRating = rating ?? "-";

  return (
    <div className={styles.rating} aria-label={`Rating ${displayedRating}`}>
      <strong>{displayedRating}</strong>
      <span>Rating</span>
    </div>
  );
}
