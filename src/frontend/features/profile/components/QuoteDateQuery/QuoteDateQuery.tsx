import { useId } from "react";
import type { usePlayerQuotes } from "../../hooks/usePlayerQuotes";
import QuoteSummary from "../QuoteSummary/QuoteSummary";

export default function QuoteDateQuery({ quotes }: { quotes: ReturnType<typeof usePlayerQuotes> }) {
  const id = useId();
  return <div>
    <h3>Consulta por fecha</h3>
    <p id={`${id}-help`}>Último valor disponible hasta la fecha seleccionada. Se permiten fechas futuras.</p>
    <form noValidate onSubmit={(event) => { event.preventDefault(); quotes.queryDate(); }}>
      <label htmlFor={id}>Fecha de consulta</label>
      <input id={id} type="date" value={quotes.selectedDate} onChange={(event) => quotes.setSelectedDate(event.target.value)}
        aria-invalid={!!quotes.dateError} aria-describedby={`${id}-help${quotes.dateError ? ` ${id}-error` : ""}`} />
      <div>
        <button type="submit">Consultar</button>
        <button type="button" onClick={quotes.clearDate}>Limpiar</button>
      </div>
    </form>
    {quotes.dateError && <p id={`${id}-error`} role="alert">{quotes.dateError}</p>}
    <div role="status">
      {quotes.dated.status === "idle" && quotes.selectedDate && <p>Consultá la fecha seleccionada para ver su resultado.</p>}
      {quotes.dated.status === "loading" && <p>Consultando fecha {quotes.requestedDate}…</p>}
      {quotes.dated.status === "empty" && <p>No hay cotización disponible hasta {quotes.requestedDate}</p>}
      {quotes.dated.status === "success" && <p>Resultado disponible. Fecha solicitada: {quotes.requestedDate}</p>}
    </div>
    {quotes.dated.status === "error" && !quotes.dateError && <div role="alert">
      <p>No se pudo consultar la fecha {quotes.requestedDate}: {quotes.dated.error}</p>
      <button type="button" onClick={quotes.queryDate}>Reintentar consulta</button>
    </div>}
    {quotes.dated.status === "success" && quotes.dated.items[0] && <QuoteSummary key={quotes.dated.generation} quote={quotes.dated.items[0]} context={`fecha solicitada ${quotes.requestedDate}`} />}
  </div>;
}
