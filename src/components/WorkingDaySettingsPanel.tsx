// 添加設置面板組件
interface WorkingDaySettings {
  workingDays: number[]; // 0-6 代表週日到週六
}

const WorkingDaySettingsPanel: React.FC<{
  settings: WorkingDaySettings;
  onSettingsChange: (settings: WorkingDaySettings) => void;
  onClose: () => void;
}> = ({ settings, onSettingsChange, onClose }) => {
  const daysOfWeek = [
    { value: 0, label: "週日" },
    { value: 1, label: "週一" },
    { value: 2, label: "週二" },
    { value: 3, label: "週三" },
    { value: 4, label: "週四" },
    { value: 5, label: "週五" },
    { value: 6, label: "週六" },
  ];

  const handleDayToggle = (day: number) => {
    const newWorkingDays = settings.workingDays.includes(day)
      ? settings.workingDays.filter((d) => d !== day)
      : [...settings.workingDays, day].sort();

    onSettingsChange({
      ...settings,
      workingDays: newWorkingDays,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">工作日設置</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">選擇工作日</h4>
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleDayToggle(value)}
                className={`p-2 rounded text-sm cursor-pointer ${
                  settings.workingDays.includes(value)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            已選擇 {settings.workingDays.length} 個工作日
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() =>
              onSettingsChange({
                workingDays: [1, 2, 3, 4, 5],
              })
            }
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            重置為預設
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm cursor-pointer"
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkingDaySettingsPanel;
