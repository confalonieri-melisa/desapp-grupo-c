import Image from "next/image";
import {getPlayerImage} from "@/utils/image-mapper";
import styles from "./PlayerCardImage.module.scss";

interface PlayerCardImageProps {
    playerId: string;
    playerName: string;
    imageUrl?: string;
}

export default function PlayerCardImage({
    playerId,
    playerName,
    imageUrl,
}: PlayerCardImageProps) {
    const imageSource = getPlayerImage(playerId, imageUrl);

    return (
        <div className={styles.placeholder}>
            <Image
                src={imageSource}
                alt={`Imagen de ${playerName}`}
                fill
                sizes="96px"
                className={styles.image}
            />
        </div>
    );
}
