import React from "react";

export interface FAQItemProps {
  question: string;
  answer: string;
  className?: string;
  buttonExpandText?: string;
  buttonCollapseText?: string;
}

export const FAQItem: React.FC<FAQItemProps> = ({
  question,
  answer,
  className = "",
  buttonExpandText = "展開",
  buttonCollapseText = "收起",
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">{question}</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? buttonCollapseText : buttonExpandText}</span>
          <svg
            className={`w-4 h-4 transform transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="text-gray-600 transition-all duration-200 ease-in-out mt-4">
          <p className="leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default FAQItem;
