import { useState } from "react";

interface ConfirmButtonProps {
  onConfirm: () => void;
  label?: string;
  confirmText?: string;
  className?: string;
}

export function ConfirmButton({
  onConfirm,
  label = "Excluir",
  confirmText = "Confirmar?",
  className = "btn btn-danger btn-sm",
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="list-item-meta">{confirmText}</span>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
        >
          Sim
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setConfirming(false)}
        >
          Não
        </button>
      </span>
    );
  }

  return (
    <button type="button" className={className} onClick={() => setConfirming(true)}>
      {label}
    </button>
  );
}
