import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import { useHolidayStore } from "./store";
import { DevTools } from "./components/DevTools";
import { ScrollToTop } from "./components/ScrollToTop";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { Statistics } from "./pages/Statistics";
import ResignationCalculator from "./pages/ResignationCalculator";
import InterviewRecord from "./pages/InterviewRecord";
import CustomHolidayForm from "./pages/CustomHolidayForm";
import { toast, ToastContainer } from "react-toastify";
import { holidayDataConvert, CachedHolidays } from "./utils/holiday";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

// 載入動畫組件
const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="text-gray-600">載入公眾假期數據...</p>
    </div>
  </div>
);

// 緩存過期時間設置（7天）
const CACHE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000;

// 將數據獲取邏輯抽離為獨立函數
const fetchHolidays = async () => {
  // 嘗試從 localStorage 獲取緩存數據
  const cachedData = localStorage.getItem("holidaysCache");

  if (cachedData) {
    try {
      const cached: CachedHolidays = JSON.parse(cachedData);
      const now = Date.now();

      // 檢查緩存是否過期
      if (now - cached.timestamp < CACHE_EXPIRY_TIME) {
        // 緩存未過期，返回緩存數據（轉換回 Date 對象）
        return cached.data.map((holiday) => ({
          ...holiday,
          date: new Date(holiday.date),
        }));
      }
    } catch (error) {
      console.warn("緩存數據解析失敗:", error);
      // 緩存數據無效，繼續獲取新數據
    }
  }

  // 從 API 獲取新數據

  const response = await fetch(
    import.meta.env.VITE_HOLIDAY_API ||
      "https://res.data.gov.hk/api/get-download-file?name=https%3A%2F%2Fwww.1823.gov.hk%2Fcommon%2Fical%2Ftc.json"
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (!data?.vcalendar?.[0]?.vevent) {
    throw new Error("Invalid holiday data format");
  }

  // 處理數據
  const holidays = holidayDataConvert(data);

  // 存儲到 localStorage
  try {
    const cacheData: CachedHolidays = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: holidays.map((holiday: any) => ({
        ...holiday,
        date: holiday.date.toISOString(), // 轉換為字符串存儲
      })),
      timestamp: Date.now(),
    };
    localStorage.setItem("holidaysCache", JSON.stringify(cacheData));
  } catch (error) {
    console.warn("緩存數據存儲失敗:", error);
    // 緩存失敗不影響正常功能
  }

  return holidays;
};

const AppContent = () => {
  const setHolidays = useHolidayStore((state) => state.setHolidays);
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 添加清除緩存並重新獲取的函數
  const handleRefreshHolidays = () => {
    // 清除 localStorage 中的緩存
    localStorage.removeItem("holidaysCache");
    // 使當前的 query 失效並重新獲取
    queryClient.invalidateQueries({ queryKey: ["holidays"] }).then(() => {
      toast.success("已更新香港公眾假期數據");
    });
  };

  const { isLoading, error } = useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      try {
        const result = await fetchHolidays();
        setHolidays(result || []);
        return result;
      } catch (error) {
        console.error("獲取假期數據失敗:", error);
        // 如果 API 請求失敗，嘗試使用緩存數據（即使已過期）
        const cachedData = localStorage.getItem("holidaysCache");
        if (cachedData) {
          try {
            const cached: CachedHolidays = JSON.parse(cachedData);
            const holidays = cached.data.map((holiday) => ({
              ...holiday,
              date: new Date(holiday.date),
            }));
            setHolidays(holidays);
            return holidays;
          } catch {
            throw error; // 如果緩存數據無效，拋出原始錯誤
          }
        }
        throw error;
      }
    },
    retry: 2,
    staleTime: CACHE_EXPIRY_TIME, // 設置數據過期時間
  });

  return (
    <>
      {isLoading && <LoadingOverlay />}
      <div className="min-h-screen bg-gray-100">
        {/* 導航欄 */}
        <nav className="bg-white shadow relative z-20">
          <div className="container mx-auto px-4">
            <div className="flex justify-between h-16">
              {/* 漢堡菜單按鈕 - 只在手機顯示 */}
              <button
                className="md:hidden flex items-center px-2"
                onClick={() => setIsDrawerOpen(true)}
              >
                <svg
                  className="w-6 h-6 text-gray-700"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* 桌面版導航菜單 */}
              <div className="hidden md:flex">
                <Link
                  to="/"
                  className="flex items-center px-4 text-gray-700 hover:text-gray-900"
                >
                  辭職日期計算器
                </Link>
                <Link
                  to="/custom-holiday"
                  className="flex items-center px-4 text-gray-700 hover:text-gray-900"
                >
                  自訂公眾假期
                </Link>
                <Link
                  to="/interview-record"
                  className="flex items-center px-4 text-gray-700 hover:text-gray-900"
                >
                  面試記錄
                </Link>
              </div>

              {/* 更新按鈕 */}
              <div className="flex items-center">
                <button
                  onClick={handleRefreshHolidays}
                  className="flex items-center px-3 py-1 rounded text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden md:inline">更新假期數據</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* 手機版抽屜菜單 */}
        <>
          {/* 背景遮罩 */}
          <div
            className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 ${
              isDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setIsDrawerOpen(false)}
          />
          {/* 抽屜菜單 */}
          <div
            className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-40 transform transition-transform duration-300 ease-out ${
              isDrawerOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full">
              {/* 抽屜頭部 */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">工具</h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-gray-600"
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
              {/* 抽屜內容 */}
              <div className="flex-1 overflow-y-auto">
                <div className="py-2">
                  <Link
                    to="/"
                    className="block px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    辭職日期計算器
                  </Link>
                  <Link
                    to="/custom-holiday"
                    className="block px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    自訂公眾假期
                  </Link>
                  <Link
                    to="/interview-record"
                    className="block px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    面試記錄
                  </Link>
                </div>
              </div>
              {/* 抽屜底部 */}
              <div className="border-t p-4">
                <button
                  onClick={() => {
                    handleRefreshHolidays();
                    setIsDrawerOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  更新假期數據
                </button>
              </div>
            </div>
          </div>
        </>

        {error && (
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">
                  無法獲取香港公眾假期數據，工作天數計算將不包括公眾假期
                  <button
                    onClick={handleRefreshHolidays}
                    className="ml-2 text-yellow-800 underline hover:text-yellow-900 cursor-pointer"
                  >
                    重試
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 路由內容 */}
        <Routes>
          <Route path="/" element={<ResignationCalculator />} />
          <Route path="/custom-holiday" element={<CustomHolidayForm />} />
          <Route path="/interview-record" element={<InterviewRecord />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route
            path="/resignation-calculator"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </div>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AppContent />
        <DevTools />
      </QueryClientProvider>
      <ScrollToTop />
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
