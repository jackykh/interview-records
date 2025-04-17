import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";

import { useHolidayStore } from "./store";
import { DevTools } from "./components/DevTools";
import { ScrollToTop } from "./components/ScrollToTop";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { Statistics } from "./pages/Statistics";
import ResignationCalculator from "./pages/ResignationCalculator";
import InterviewRecord from "./pages/InterviewRecord";

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

// 定義緩存數據的類型
interface CachedHolidays {
  data: Array<{
    date: string; // 存儲時轉為字符串
    name: string;
  }>;
  timestamp: number;
}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const holidays = data.vcalendar[0].vevent.map((event: any) => ({
    date: new Date(
      event.dtstart[0].replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
    ),
    name: event.summary,
  }));

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

  const { isLoading } = useQuery({
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
        <nav className="bg-white shadow">
          <div className="container mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex">
                <Link
                  to="/"
                  className="flex items-center px-4 text-gray-700 hover:text-gray-900"
                >
                  辭職日期計算器
                </Link>
                <Link
                  to="/interview-record"
                  className="flex items-center px-4 text-gray-700 hover:text-gray-900"
                >
                  面試記錄
                </Link>
                <Link
                  to="/statistics"
                  className="flex items-center px-4 text-gray-700 hover:text-gray-900"
                >
                  數據統計
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* 路由內容 */}
        <Routes>
          <Route path="/" element={<ResignationCalculator />} />
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
        <ScrollToTop />
        <DevTools />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
