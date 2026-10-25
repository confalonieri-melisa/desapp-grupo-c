import { useId } from "react";
import type { usePlayerQuotes } from "../../hooks/usePlayerQuotes";
import { formatQuoteDate } from "../../utils/player-quotes";
import QuoteSummary from "../QuoteSummary/QuoteSummary";
import styles from "../PlayerQuotesSection/PlayerQuotesSection.module.scss";

export default function QuoteDateQuery({ quotes }: { quotes: ReturnType<typeof usePlayerQuotes> }) {
  const id = useId();
  return <div className={styles.datePanel}>
    <div className={styles.panelHeading}><h3>Consultar otra fecha</h3></div>
    <p id={`${id}-help`} className={styles.helper}>Encontrá el último valor disponible hasta el día elegido, incluso si la cotización se calculó antes.</p>
    <form className={styles.dateForm} noValidate onSubmit={(event) => { event.preventDefault(); quotes.queryDate(); }}>
      <label htmlFor={id}>Fecha de consulta</label>
      <div className={styles.dateControls}>
        <input id={id} type="date" value={quotes.selectedDate} onChange={(event) => quotes.setSelectedDate(event.target.value)}
          aria-invalid={!!quotes.dateError} aria-describedby={`${id}-help${quotes.dateError ? ` ${id}-error` : ""}`} />
        <button type="submit">Consultar</button>
        {quotes.selectedDate && <button className={styles.clearButton} type="button" onClick={quotes.clearDate}>Limpiar</button>}
      </div>
    </form>
    {quotes.dateError && <p className={styles.errorText} id={`${id}-error`} role="alert">{quotes.dateError}</p>}
    <div role="status" className={styles.queryStatus}>
      {quotes.dated.status === "idle" && quotes.selectedDate && <p>Consultá para ver el valor de esa fecha.</p>}
      {quotes.dated.status === "loading" && <p>Buscando el valor hasta el {formatQuoteDate(quotes.requestedDate)}…</p>}
      {quotes.dated.status === "empty" && <p>No hay cotización disponible hasta el {formatQuoteDate(quotes.requestedDate)}.</p>}
    </div>
    {quotes.dated.status === "error" && !quotes.dateError && <div className={styles.queryStatus} role="alert">
      <p>No se pudo consultar el {formatQuoteDate(quotes.requestedDate)}: {quotes.dated.error}</p>
      <button type="button" onClick={quotes.queryDate}>Reintentar consulta</button>
    </div>}
    {quotes.dated.status === "success" && quotes.dated.items[0] && <div key={quotes.dated.generation} className={styles.dateResult}>
      <p className={styles.resultLabel}>Último valor disponible hasta el {formatQuoteDate(quotes.requestedDate)}</p>
      <QuoteSummary quote={quotes.dated.items[0]} context={`fecha solicitada ${quotes.requestedDate}`} variant="result" />
    </div>}
  </div>;
}
