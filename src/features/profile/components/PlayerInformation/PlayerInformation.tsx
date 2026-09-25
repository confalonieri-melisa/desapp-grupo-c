import type {PlayerApiDetail} from "@/services/client/player.service";
import {formatEnumLabel, leagueLabels} from "@/utils/player-labels";
import styles from "./PlayerInformation.module.scss";

interface PlayerInformationProps {
    player: PlayerApiDetail;
}

export default function PlayerInformation({player}: PlayerInformationProps) {
    const rows = [
        ["Equipo", player.team],
        ["Liga", leagueLabels[player.league] ?? formatEnumLabel(player.league)],
        ["Posición", player.position],
    ];

    return (
        <section className={styles.section} aria-labelledby="player-information-title">
            <h2 id="player-information-title">Información del jugador</h2>
            <dl>
                {rows.map(([label, value]) => (
                    <div className={styles.row} key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
