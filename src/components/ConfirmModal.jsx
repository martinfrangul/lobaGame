const ConfirmModal = ({
  open,
  title = "Confirmar",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal setup-card confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="joker-choice-options">
          <button className="start-button" onClick={onConfirm}>{confirmLabel}</button>
          <button className="setup-option" onClick={onCancel}>{cancelLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;