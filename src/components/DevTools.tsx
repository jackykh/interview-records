import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "../db";
import { subDays } from "date-fns";

const companies = [
  "谷歌",
  "蘋果",
  "微軟",
  "亞馬遜",
  "Meta",
  "騰訊",
  "阿里巴巴",
  "字節跳動",
  "美團",
  "京東",
  "網易",
  "百度",
  "快手",
  "小米",
  "Shopee",
];

const positions = [
  "前端工程師",
  "後端工程師",
  "全棧工程師",
  "DevOps工程師",
  "移動端工程師",
  "算法工程師",
  "數據工程師",
  "測試工程師",
  "產品經理",
  "UI設計師",
];

const statuses = ["pending", "passed", "failed"] as const;

export const DevTools: React.FC = () => {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [count, setCount] = React.useState(100);

  const generateMutation = useMutation({
    mutationFn: async (count: number) => {
      setIsGenerating(true);
      const today = new Date();
      const mockData = Array.from({ length: count }, () => {
        const company = companies[Math.floor(Math.random() * companies.length)];
        const position =
          positions[Math.floor(Math.random() * positions.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const daysAgo = Math.floor(Math.random() * 60); // 隨機0-60天前
        const round = Math.floor(Math.random() * 3) + 1; // 1-3輪
        const date = subDays(today, daysAgo);

        return {
          company,
          position,
          date,
          status,
          round,
          notes: `這是第${round}輪面試的備注`,
        };
      });

      // 批量添加數據
      await db.interviews.bulkAdd(mockData);
      return count;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error("生成測試數據失敗:", error);
      setIsGenerating(false);
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await db.interviews.clear();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
  });

  const generateRandomInterviews = () => {
    if (count > 0) {
      generateMutation.mutate(count);
    }
  };

  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">開發工具</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-20 px-2 py-1 text-sm border rounded"
              min="1"
              max="10000"
            />
            <button
              onClick={generateRandomInterviews}
              disabled={isGenerating}
              className={`text-sm px-3 py-1 rounded ${
                isGenerating
                  ? "bg-gray-100 text-gray-400"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center space-x-1">
                  <svg
                    className="animate-spin h-4 w-4 text-gray-500"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>生成中...</span>
                </span>
              ) : (
                "生成測試數據"
              )}
            </button>
          </div>
          <div className="text-xs text-gray-500">
            將生成 {count} 條隨機面試記錄
          </div>
          <button
            onClick={() => {
              if (confirm("確定要清空所有數據嗎？")) {
                clearMutation.mutate();
              }
            }}
            className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            清空所有數據
          </button>
          <div className="text-xs text-gray-400 mt-2">* 僅在開發環境可見</div>
        </div>
      </div>
    </div>
  );
};
