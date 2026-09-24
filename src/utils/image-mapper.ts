import type { StaticImageData } from "next/image";
import playerPlaceholder1 from "@/assets/players/1.png";
import playerPlaceholder2 from "@/assets/players/2.png";
import playerPlaceholder3 from "@/assets/players/3.png";
import playerPlaceholder4 from "@/assets/players/4.png";
import playerPlaceholder5 from "@/assets/players/5.png";
import playerPlaceholder6 from "@/assets/players/6.png";

const placeholderImages: readonly StaticImageData[] = [
  playerPlaceholder1,
  playerPlaceholder2,
  playerPlaceholder3,
  playerPlaceholder4,
  playerPlaceholder5,
  playerPlaceholder6,
];

function getStableIndex(value: string, collectionSize: number): number {
  return [...value].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % collectionSize;
}

export function getPlayerImage(
  playerId: string,
  imageUrl?: string,
): StaticImageData | string {
  return imageUrl ?? placeholderImages[getStableIndex(playerId, placeholderImages.length)];
}
