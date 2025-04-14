import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { InterviewForm } from "./components/interviewForm";
import { InterviewList } from "./components/interviewList";
import { useHolidayStore } from "./store";
import HolidayList from "./components/HolidayList";
import { DevTools } from "./components/DevTools";
import { ScrollToTop } from "./components/ScrollToTop";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Statistics } from "./pages/Statistics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

// 加載動畫組件
const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="text-gray-600">加載公眾假期數據...</p>
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

// 主應用內容組件
const AppContent = () => {
  const setHolidays = useHolidayStore((state) => state.setHolidays);

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
    <div className="min-h-screen bg-gray-100">
      {isLoading && <LoadingOverlay />}
      <div className="container mx-auto py-8 px-4">
        {error && (
          <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
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
                </p>
              </div>
            </div>
          </div>
        )}
        <h1 className="text-3xl font-bold mb-8">等 Offer...</h1>

        {/* 添加假期列表 */}
        <div className="mb-8">
          <HolidayList />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className={isLoading ? "pointer-events-none opacity-50" : ""}>
            <h2 className="text-xl font-semibold mb-4">新增記錄</h2>
            <InterviewForm />
          </div>
          <div className={isLoading ? "pointer-events-none opacity-50" : ""}>
            <InterviewList />
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
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
            <Route path="/" element={<AppContent />} />
            <Route path="/statistics" element={<Statistics />} />
          </Routes>
        </div>
        <ScrollToTop />
        <DevTools />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
