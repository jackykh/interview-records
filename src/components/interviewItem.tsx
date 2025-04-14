import type { Interview } from "../types";
import { formatWorkingDays, calculateWorkingDays } from "../utils/date";

// 面試記錄項組件
const InterviewItem: React.FC<{
  interview: Interview;
  style: React.CSSProperties;
  onAction: (interview: Interview) => void;
}> = ({ interview, style, onAction }) => (
  <div style={style} className="px-4">
    <div className="bg-white p-4 rounded-lg shadow relative my-2">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{interview.company}</h3>
          <p className="text-gray-600">{interview.position}</p>
          <p className="text-sm text-gray-500">
            {new Date(interview.date).toLocaleDateString()}
            {interview.round && ` (第${interview.round}輪)`}
          </p>
          <p className="text-sm mt-1">
            <span
              className={`inline-block px-2 py-1 rounded ${
                interview.status === "passed"
                  ? "bg-green-100 text-green-800"
                  : interview.status === "failed"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {interview.status === "passed"
                ? "已錄取"
                : interview.status === "failed"
                ? "未通過"
                : "進行中"}
            </span>
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {formatWorkingDays(
              calculateWorkingDays(new Date(interview.date)),
              new Date(interview.date)
            )}
          </span>
          <button
            onClick={() => onAction(interview)}
            className="ml-2 p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
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
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        </div>
      </div>
      {interview.notes && (
        <p className="mt-2 text-gray-700">{interview.notes}</p>
      )}
    </div>
  </div>
);

export default InterviewItem;
