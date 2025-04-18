import { useState } from "react";
import { toast } from "react-toastify";
import { CachedHolidays, holidayDataConvert, TVEvent } from "../utils/holiday";
import { MAX_TIMESTAMP } from "../utils/date";
import { useQueryClient } from "@tanstack/react-query";

const CustomHolidayForm = () => {
  const [jsonInput, setJsonInput] = useState("");
  const [rawText, setRawText] = useState("");
  const [isHelperOpen, setIsHelperOpen] = useState(false);
  const queryClient = useQueryClient();

  // 預設範本和prompt模板
  const defaultHolidays = `{
  "vcalendar": [
    {
      "vevent": [
        {"dtstart": ["20250101"], "summary": "一月一日"},
        {"dtstart": ["20250129"], "summary": "農曆年初一"}
      ]
    }
  ]
}`;

  const aiPromptTemplate = `請將以下假期列表轉換為嚴格符合此JSON格式：
- 日期用YYYYMMDD格式的字串陣列
- 保留原始假期名稱
- 範例格式：
${JSON.stringify(JSON.parse(defaultHolidays), null, 2)}

需要轉換的原始文本：
-------------------------
{USER_TEXT}
-------------------------
請只輸出JSON，不要其他解釋內容。`;

  // 複製功能
  const copyPrompt = async () => {
    const fullPrompt = aiPromptTemplate.replace("{USER_TEXT}", rawText);
    try {
      await navigator.clipboard.writeText(fullPrompt);
      toast.success("📋 已複製完整指令到剪貼簿！");
    } catch (err) {
      if (err) {
        toast.error("❌ 複製失敗，請手動複製");
      }
    }
  };

  // 驗證日期格式
  const isValidDate = (dateStr: string) => {
    return /^(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$/.test(dateStr);
  };

  // 儲存處理
  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonInput);

      // 結構驗證
      if (!parsed.vcalendar?.[0]?.vevent) {
        throw new Error("JSON 結構不符合要求");
      }

      // 日期格式檢查
      const hasInvalidDate = parsed.vcalendar[0].vevent.some((event: TVEvent) =>
        event.dtstart.some((date: string) => !isValidDate(date))
      );

      if (hasInvalidDate) {
        throw new Error("日期必須為 YYYYMMDD 格式");
      }
      const holidays = holidayDataConvert(parsed);

      // 存儲到 localStorage
      const cacheData: CachedHolidays = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: holidays.map((holiday: any) => ({
          ...holiday,
          date: holiday.date.toISOString(), // 轉換為字符串存儲
        })),
        timestamp: MAX_TIMESTAMP,
      };

      localStorage.setItem("holidaysCache", JSON.stringify(cacheData));

      queryClient.invalidateQueries({ queryKey: ["holidays"] });

      toast.success("自訂假期已成功更新！");
    } catch (error) {
      toast.error(`錯誤：${(error as Error).message}`);
    }
  };

  // 折疊控制
  const HelperSection = () => (
    <div className="mb-4 border rounded-lg">
      <div
        onClick={() => setIsHelperOpen(!isHelperOpen)}
        className="w-full p-4 flex justify-between items-center"
      >
        <span className="font-semibold">🛠️ 如何使用AI轉換格式？</span>
        <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer">
          <span>{isHelperOpen ? "收起" : "展開"}</span>
          <svg
            className={`w-4 h-4 transform transition-transform duration-200 ${
              isHelperOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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

      {isHelperOpen && (
        <div className="p-4 border-t bg-gray-50">
          <div className="space-y-4">
            <div>
              <p className="font-medium mb-2">1. 貼上原始假期列表</p>
              <p className="mb-2 text-sm text-gray-600">
                （任何包含所需假期資訊（年份、日期、假期名稱）的文字，格式不限，如
                <a
                  href="https://www.gov.uk/bank-holidays"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  英國政府網發佈的假期列表
                </a>
                ）
              </p>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="任何包含所需假期資訊的文字，範例輸入：
2025
Date	Day of the week	Bank holiday
18 April	Friday	Good Friday
21 April	Monday	Easter Monday
5 May	Monday	Early May bank holiday"
                className="w-full h-32 p-3 border rounded-md text-sm"
              />
            </div>

            <div>
              <p className="font-medium mb-2">2. 生成AI指令</p>
              <button
                onClick={copyPrompt}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-md hover:bg-blue-200 cursor-pointer"
              >
                📋 複製完整AI轉換指令
              </button>
              <p className="mt-2 text-sm text-gray-600">
                貼到 ChatGPT/Deepseek 等AI工具後即可取得正確JSON格式
              </p>
            </div>

            <div className="p-3 bg-white rounded border">
              <p className="text-sm font-medium mb-2">指令預覽：</p>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                {aiPromptTemplate.replace(
                  "{USER_TEXT}",
                  rawText || "（您的文本將顯示在此）"
                )}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 其他部分保持原有逻辑不变...

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">自訂公眾假期</h2>

      <HelperSection />

      {/* 原有JSON输入和保存部分 */}
      <div className="mb-4 text-gray-600">
        <p className="font-medium mb-2">3. 在此貼上正確的JSON格式：</p>
        <p className="mb-2 text-sm text-gray-600">
          儲存後，公眾假期將始終保持為自定義的的公眾假期。如需恢復到最新的香港公眾假期，可點擊右上角「更新假期數據」圖標。
        </p>
      </div>

      <textarea
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        className="w-full h-64 p-4 border rounded-lg font-mono text-sm mb-4"
        spellCheck="false"
        placeholder={defaultHolidays}
      />

      {/* 保存按钮组 */}
      <div className="flex gap-4">
        <button
          disabled={jsonInput.trim() ? false : true}
          onClick={handleSave}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          儲存設定
        </button>
        <button
          onClick={() => setJsonInput("")}
          className="px-6 py-2 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer"
        >
          清空
        </button>
      </div>
    </div>
  );
};

export default CustomHolidayForm;
