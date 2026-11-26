// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import P2POfferList from "@/frontend/features/profile/components/PlayerTradingSection/P2POfferList";
import P2PConfirmationDialog from "@/frontend/features/profile/components/PlayerTradingSection/P2PConfirmationDialog";
import type { useP2POffers } from "@/frontend/features/profile/hooks/useP2POffers";
import { offer, ownOffer, investor } from "./fixtures/p2p-ui";
afterEach(cleanup);
const state = () =>
  ({
    offers: [offer, ownOffer],
    status: "ready",
    result: { status: "idle" },
    refresh: vi.fn(),
    openAccept: vi.fn(),
    cancelConfirmation: vi.fn(),
    confirm: vi.fn(),
  }) as unknown as ReturnType<typeof useP2POffers>;
it("offers full purchase only for another seller and preserves full identity", () => {
  const p2p = state();
  render(<P2POfferList p2p={p2p} userId={investor.id} balance={100} operable />);
  fireEvent.click(screen.getByText("Comprar oferta completa"));
  expect(p2p.openAccept).toHaveBeenCalledWith(offer, investor.id, 100, true);
  expect(screen.getByTitle(offer.sellerId)).toBeTruthy();
  expect(screen.queryByRole("textbox")).toBeNull();
});
it("does not expose operations to SUPERUSER", () => {
  render(<P2POfferList p2p={state()} userId={investor.id} balance={100} operable={false} />);
  expect(screen.queryByText("Comprar oferta completa")).toBeNull();
});
it("focuses cancel, handles Escape and returns focus without submitting", () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  const p2p = { ...state(), confirmation: { type: "accept", offer, key: "key" } } as ReturnType<
    typeof useP2POffers
  >;
  const r = render(<P2PConfirmationDialog p2p={p2p} playerName="Jugador" />);
  expect(document.activeElement).toBe(screen.getByText("Volver"));
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true, cancelable: true }));
  expect(p2p.cancelConfirmation).toHaveBeenCalledOnce();
  expect(p2p.confirm).not.toHaveBeenCalled();
  r.unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});

import P2PPublishForm from "@/frontend/features/profile/components/PlayerTradingSection/P2PPublishForm";
it("associates publish fields and errors and describes no reservation", () => {
  const p2p = {
    ...state(),
    draft: { quantity: "2", price: "1.001" },
    setDraft: vi.fn(),
    openPublish: vi.fn(),
  };
  render(<P2PPublishForm p2p={p2p as unknown as ReturnType<typeof useP2POffers>} holding={5} />);
  expect(screen.getByLabelText("Precio fijo por token").getAttribute("aria-invalid")).toBe("true");
  expect((screen.getByText("Revisar publicaci?n") as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText(/no se reservan/)).toBeTruthy();
});

it("keeps own cancellation inline in the single mixed list", () => {
  const p2p = { ...state(), openCancel: vi.fn() };
  render(<P2POfferList p2p={p2p} userId={investor.id} balance={100} operable />);
  fireEvent.click(screen.getByText("Cancelar oferta propia"));
  expect(p2p.openCancel).toHaveBeenCalledWith(ownOffer, investor.id);
  expect(screen.getAllByRole("list")).toHaveLength(1);
});
