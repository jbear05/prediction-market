import { useEffect, useRef, useState } from "react";
import type { Market } from "./marketAPI";
import type { FormEvent } from "react";
import { placeMarketBet } from "./marketAPI";

type MarketPopupProps = {
  market: Market;
  onBetPlaced: (question: Pick<Market, "_id" | "poolYes" | "poolNo">) => void;
  onClose: () => void;
};

// display the selected market in a popup
export default function MarketPopup({
  market,
  onClose,
  onBetPlaced
}: MarketPopupProps) {
  const popupRef = useRef<HTMLDialogElement>(null);
  const [side, setSide] = useState<"yes" | "no" | null>(null);
  const [amount, setAmount] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [betError, setBetError] = useState("");
  const [betResult, setBetResult] = useState<Awaited<ReturnType<typeof placeMarketBet>> | null>(null);
  // open the popup when this component appears
  useEffect(() => {
    const popup = popupRef.current;
    popup?.showModal();

    return () => {
      popup?.close();
    };
  }, []);

  const isOpen = market.status === "open" && new Date(market.closesAt).getTime() > Date.now();

  const coinAmount = Number(amount);
  const validAmount = Number.isSafeInteger(coinAmount) && coinAmount >= 1;
  const poolYes = betResult?.question.poolYes ?? market.poolYes;
  const poolNo = betResult?.question.poolNo ?? market.poolNo;

  async function handleBet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isOpen || !side || !validAmount || isSubmitting || betResult) {
      return;
    }

    setBetError("");
    setIsSubmitting(true);

    try {
      const result = await placeMarketBet(market._id, side, coinAmount);
      setBetResult(result);
      onBetPlaced(result.question);
    } catch (error) {
      setBetError(
        error instanceof Error ? error.message : "Unable to confirm your bet.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={popupRef}
      className="market-popup"
      aria-labelledby="market-popup-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) onClose();
      }}
    >
      {/* close the popup */}
      <button
        className="market-popup-close"
        type="button"
        aria-label="Close market details"
        onClick={onClose}
        disabled={isSubmitting}
      >
        ×
      </button>

      <h2 id="market-popup-title">{market.title}</h2>

      <p>
        {market.category === "campus" ? "UCF/Campus" : market.category}
        {" · Created by "}
        {market.creator?.displayName ?? "Unknown user"}
      </p>

      <p>
        {isOpen ? "Open · Approved market" : "Wagering unavailable"}
      </p>

      <h3>Description and resolution criteria</h3>
      <p>{market.description}</p>

      <p>
        Closes{" "}
        {new Date(market.closesAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })}
      </p>

      {/* pool values from the selected market */}
      <div className="market-popup-pools">
        <p>
          <strong>
            Total wagered: {(poolYes + poolNo).toLocaleString()} coins
          </strong>
        </p>
        <p>YES pool: {poolYes.toLocaleString()} coins</p>
        <p>NO pool: {poolNo.toLocaleString()} coins</p>
      </div>
      
      {/* choose a prediction and wager amount */}
      <form
        className="market-wager-form"
        onSubmit={handleBet}
      >
        <fieldset disabled={!isOpen || isSubmitting || betResult !== null}>
          <legend>Choose your side</legend>

          <div className="market-side-options">
            <button
              type="button"
              aria-pressed={side === "yes"}
              onClick={() => setSide("yes")}
            >
              YES
            </button>

            <button
              type="button"
              aria-pressed={side === "no"}
              onClick={() => setSide("no")}
            >
              NO
            </button>
          </div>

          <p className="market-side-message" role="status">
            {side ? `${side.toUpperCase()} selected` : "Select YES or NO."}
          </p>

          <label htmlFor="wager-amount">Coin amount</label>
          <input
            id="wager-amount"
            name="amount"
            type="number"
            min={1}
            step={1}
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-describedby="wager-amount-help"
          />

          <small id="wager-amount-help">
            Whole numbers only · Minimum 1 coin
          </small>

          <button
            className="market-confirm"
            type="submit"
            disabled={!side || !validAmount}
          >
            {betResult ? "Bet placed" : isSubmitting ? "Submitting..." : isOpen ? "Confirm bet" : "Market closed"}
          </button>
        </fieldset>
        {betError && <p role="alert">{betError}</p>}

        {betResult && (
          <p role="status">
            Bet placed: {coinAmount} coins on {side?.toUpperCase()}.
            {" "}Balance: {betResult.balance.toLocaleString()} coins.
          </p>
        )}
      </form>
    </dialog>
  );
}