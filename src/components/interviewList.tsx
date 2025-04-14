import React, { useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { db } from "../db";
import { calculateWorkingDays, formatDateForInput } from "../utils/date";
import type { Interview } from "../types";
import { subDays } from "date-fns";
import InterviewItem from "./interviewItem";
import Modal from "./Modal";
import LoadingSpinner from "./LoadingSpinner";

const PAGE_SIZE = 10; // 每頁顯示的記錄數

export const InterviewList: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedInterview, setSelectedInterview] =
    React.useState<Interview | null>(null);
  const [activeModal, setActiveModal] = React.useState<
    "action" | "nextRound" | "delete" | "clearAll" | null
  >(null);
  const [showBatchUpdateModal, setShowBatchUpdateModal] = React.useState(false);

  // 使用 useInfiniteQuery 處理分頁加載
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["interviews"],
    queryFn: async ({ pageParam = 0 }) => {
      const interviews = await db.interviews
        .offset(pageParam * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray();

      const total = await db.interviews.count();

      return {
        interviews,
        nextPage: interviews.length === PAGE_SIZE ? pageParam + 1 : undefined,
        total,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  // 監聽滾動加載更多
  const observerTarget = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const interviews = data?.pages.flatMap((page) => page.interviews) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;

  const updateInterviewMutation = useMutation({
    mutationFn: async (data: Partial<Interview> & { id: number }) => {
      return await db.interviews.update(data.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      setSelectedInterview(null);
    },
  });

  const deleteInterviewMutation = useMutation({
    mutationFn: async (id: number) => {
      return await db.interviews.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      setSelectedInterview(null);
    },
  });

  const handleStatusUpdate = (status: Interview["status"]) => {
    if (!selectedInterview?.id) return;
    updateInterviewMutation.mutate({
      id: selectedInterview.id,
      status,
    });
  };

  const handleNextRound = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInterview?.id) return;

    const formData = new FormData(e.currentTarget);
    updateInterviewMutation.mutate({
      id: selectedInterview.id,
      date: new Date(formData.get("date") as string),
      notes: (formData.get("notes") as string) || selectedInterview.notes,
      status: "pending",
      round: (selectedInterview.round || 1) + 1,
    });
  };

  const handleDelete = () => {
    if (!selectedInterview?.id) return;
    deleteInterviewMutation.mutate(selectedInterview.id);
  };

  const closeAllModals = () => {
    setActiveModal(null);
    setSelectedInterview(null);
  };

  // 添加清空所有記錄的 mutation
  const clearAllInterviewsMutation = useMutation({
    mutationFn: async () => {
      return await db.interviews.clear();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      closeAllModals();
    },
  });

  // 批量更新的 mutation
  const batchUpdateMutation = useMutation({
    mutationFn: async (days: number) => {
      //   const currentDate = new Date();
      const interviews = await db.interviews.toArray();

      // 找出需要更新的面試記錄
      const interviewsToUpdate = interviews.filter((interview) => {
        const workingDays = calculateWorkingDays(new Date(interview.date));
        return workingDays >= days && interview.status !== "passed";
      });

      // 批量更新
      await Promise.all(
        interviewsToUpdate.map((interview) =>
          db.interviews.update(interview.id!, { status: "failed" })
        )
      );

      return interviewsToUpdate.length;
    },
    onSuccess: (updatedCount) => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      setShowBatchUpdateModal(false);
      alert(`已將 ${updatedCount} 條面試記錄標記為未通過`);
    },
  });

  const ActionMenu = () => (
    <Modal
      title={`${selectedInterview?.company} - 操作選項`}
      onClose={closeAllModals}
    >
      <div className="space-y-2">
        <button
          onClick={() => {
            handleStatusUpdate("passed");
            closeAllModals();
          }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer"
        >
          標記為通過
        </button>
        <button
          onClick={() => {
            handleStatusUpdate("failed");
            closeAllModals();
          }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer"
        >
          標記為失敗
        </button>

        {selectedInterview?.status === "pending" && (
          <button
            onClick={() => {
              setActiveModal("nextRound");
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer"
          >
            進入下一輪
          </button>
        )}
        <button
          onClick={() => {
            setActiveModal("delete");
          }}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
        >
          刪除記錄
        </button>
      </div>
    </Modal>
  );

  const DeleteConfirmDialog = () => (
    <Modal title="確認刪除" onClose={closeAllModals}>
      <div className="space-y-4">
        <p className="text-gray-600">
          確定要刪除 {selectedInterview?.company} 的面試記錄嗎？此操作無法撤銷。
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={closeAllModals}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => {
              handleDelete();
              closeAllModals();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 cursor-pointer"
          >
            確認刪除
          </button>
        </div>
      </div>
    </Modal>
  );

  const NextRoundForm = () => (
    <Modal
      title={`進入下一輪面試 - ${selectedInterview?.company}`}
      onClose={closeAllModals}
    >
      <form
        onSubmit={(e) => {
          handleNextRound(e);
          closeAllModals();
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            下一輪面試日期
          </label>
          <input
            type="date"
            name="date"
            required
            min={formatDateForInput(
              selectedInterview?.date || subDays(new Date(), 365)
            )}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            更新備注（可選）
          </label>
          <textarea
            name="notes"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
            placeholder={selectedInterview?.notes || ""}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={closeAllModals}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer"
          >
            確認
          </button>
        </div>
      </form>
    </Modal>
  );

  // 清空確認對話框組件
  const ClearAllConfirmDialog = () => (
    <Modal title="清空所有記錄" onClose={closeAllModals}>
      <div className="space-y-4">
        <p className="text-gray-600">
          確定要清空所有面試記錄嗎？此操作無法撤銷。
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={closeAllModals}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => {
              clearAllInterviewsMutation.mutate();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 cursor-pointer"
          >
            確認清空
          </button>
        </div>
      </div>
    </Modal>
  );

  // 批量更新模態框組件
  const BatchUpdateModal = () => (
    <Modal
      title="批量更新面試狀態"
      onClose={() => setShowBatchUpdateModal(false)}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const days = parseInt((e.target as HTMLFormElement).days.value);
          if (days > 0) {
            batchUpdateMutation.mutate(days);
          }
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            超過工作日數
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="number"
              name="days"
              min="1"
              defaultValue="14"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">天</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            將超過指定工作日數且未標記為"已錄取"的面試記錄標記為"未通過"
          </p>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => setShowBatchUpdateModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer"
          >
            確認
          </button>
        </div>
      </form>
    </Modal>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-red-500">加載失敗，請刷新重試</div>
    );
  }

  if (!interviews.length) {
    return <div className="text-center py-8 text-gray-500">暫無面試記錄</div>;
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* 列表頭部 */}
      <div className="flex justify-between items-center mb-4 px-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">
          面試記錄 ({totalCount})
        </h2>
        <div className="space-x-2">
          <button
            onClick={() => setShowBatchUpdateModal(true)}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md flex items-center space-x-1 cursor-pointer"
          >
            <svg
              className="w-4 h-4"
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
            <span>批量更新</span>
          </button>
          {totalCount > 0 && (
            <button
              onClick={() => setActiveModal("clearAll")}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md flex items-center space-x-1 cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>清空記錄</span>
            </button>
          )}
        </div>
      </div>

      {/* 列表內容 */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
        {interviews.map((interview) => (
          <InterviewItem
            key={interview.id}
            interview={interview}
            style={{}}
            onAction={(interview) => {
              setSelectedInterview(interview);
              setActiveModal("action");
            }}
          />
        ))}

        {/* 加載更多觸發器 */}
        <div
          ref={observerTarget}
          className="h-8 flex items-center justify-center"
        >
          {isFetchingNextPage ? (
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : hasNextPage ? (
            <span className="text-sm text-gray-500">向下滾動加載更多</span>
          ) : (
            <span className="text-sm text-gray-500">已加載全部記錄</span>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedInterview && (
        <>
          {activeModal === "action" && <ActionMenu />}
          {activeModal === "nextRound" && <NextRoundForm />}
          {activeModal === "delete" && <DeleteConfirmDialog />}
        </>
      )}
      {activeModal === "clearAll" && <ClearAllConfirmDialog />}
      {showBatchUpdateModal && <BatchUpdateModal />}
    </div>
  );
};
