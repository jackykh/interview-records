import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  // 監聽滾動事件
  useEffect(() => {
    const toggleVisibility = () => {
      // 當頁面滾動超過 300px 時顯示按鈕
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  // 路由變化時滾動到頂部
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-4 right-4 z-40
        w-10 h-10
        bg-blue-500 hover:bg-blue-600
        text-white
        rounded-full
        shadow-lg
        flex items-center justify-center
        transition-all duration-300 ease-in-out
        transform hover:scale-110
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 cursor-pointer
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
      `}
      aria-label="回到頂部"
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
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
};
