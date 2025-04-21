import React from "react";
import FAQItem, { FAQItemProps } from "../components/FAQItem"; // 根据实际路径调整

interface FAQCategory {
  id: string;
  title: string;
  items: FAQItemProps[];
}

const faqCategories: FAQCategory[] = [
  {
    id: "general",
    title: "一般問題",
    items: [
      {
        question: "「辭職日期計算器」是什麼？",
        answer:
          "辭職日期計算器是專為香港上班族設計的小工具，能根據《僱傭條例》與個人合約條款，自動推算最有利的離職時間方案。透過分析試用期狀態、公司通知期規則及公眾假期，精準計算「實際需工作日數」與「最後工作日」，並推薦能最大化假期效益的黃金辭職日期，幫助用戶合法節省工作天數、避免勞動糾紛。",
      },
      {
        question: "《僱傭條例》中一個月的定義？",
        answer:
          "根據《僱傭條例》，一個「月」指由發出終止僱傭合約通知之日起計，直至：下個月份同一日的前一日 (如2月13日至3月12日)。如下個月份並無同一日，則至下個月份最後一日 (如 1 月 30 日至 2 月最後一日)。如發出通知之日為一個月的最後一日，則至下個月份最後一日 (如 2 月最後一日至 3 月 31 日)。",
      },
      {
        question: "公眾假期資料來自哪裡？",
        answer:
          "本工具採用香港政府數碼政策辦公室提供的公眾假期API，確保假期資訊準確可靠。",
      },
      {
        question: "「面試紀錄」是什麼？",
        answer:
          "「面試紀錄」是一款為面試者設計的小工具，專門用於追蹤求職面試記錄和管理整個面試流程，提供多項實用功能幫助您高效管理求職過程。首先，您可以方便地記錄和追蹤所有求職面試的詳細信息，包括公司名稱、職位、面試時間和面試官等關鍵信息。其次，系統會自動計算自面試日起的工作日天數，智能排除周末和香港公眾假期，讓您清晰掌握企業回覆的等待時間。此外，我們還提供直觀的數據統計和趨勢分析功能，幫助您從了解自己的求職進展。",
      },
      {
        question: "如何反饋BUG及意見？",
        answer: "我的聯絡電郵是 topiary.bugs.5j@icloud.com。",
      },
    ],
  },
];

const FAQPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 頁面標題 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            常見問題
          </h1>
        </div>

        {/* 分類區塊 */}
        <div className="space-y-8">
          {faqCategories.map((category) => (
            <section
              key={category.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              {/* 分類標題 */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-800">
                  {category.title}
                </h2>
              </div>

              {/* 問題列表 */}
              <div className="px-6 py-4 space-y-4">
                {category.items.map((item, index) => (
                  <FAQItem
                    key={`${category.id}-${index}`}
                    question={item.question}
                    answer={item.answer}
                    className="border-b border-gray-100 last:border-b-0"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex justify-center">
            <span className="text-sm text-gray-500">
              意見反饋：
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="mailto:topiary.bugs.5j@icloud.com"
              >
                topiary.bugs.5j@icloud.com
              </a>
            </span>
          </div>
          <div className="flex justify-center">
            <a
              href="https://github.com/jackykh/interview-records"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-800 hover:text-blue-900"
            >
              Source on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
