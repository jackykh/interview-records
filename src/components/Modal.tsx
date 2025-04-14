const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  showCloseButton?: boolean;
}> = ({ title, onClose, children, showCloseButton = true }) => (
  <div
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-lg w-full max-w-md"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h3 className="text-lg font-semibold">{title}</h3>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

export default Modal;
