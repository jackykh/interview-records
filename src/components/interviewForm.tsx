import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "../db";
import { Interview } from "../types";
import { getEarliestSelectableDate, formatDateForInput } from "../utils/date";

export const InterviewForm: React.FC = () => {
  const queryClient = useQueryClient();
  const minDate = getEarliestSelectableDate();

  const createInterview = useMutation({
    mutationFn: async (data: Omit<Interview, "id">) => {
      return await db.interviews.add(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const interviewData: Omit<Interview, "id"> = {
      company: formData.get("company") as string,
      position: formData.get("position") as string,
      date: new Date(formData.get("date") as string),
      notes: formData.get("notes") as string,
      status: "pending",
    };

    createInterview.mutate(interviewData);
    form.reset();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 bg-white rounded-lg shadow"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">公司</label>
        <input
          type="text"
          name="company"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">職位</label>
        <input
          type="text"
          name="position"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          面試日期及時間
        </label>
        <input
          type="datetime-local"
          name="date"
          required
          min={formatDateForInput(minDate)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
        />
        {/* <p className="mt-1 text-sm text-gray-500">
          只能選擇 {format(minDate, "yyyy年MM月dd日")} 之後的日期
        </p> */}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">備注</label>
        <textarea
          name="notes"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 cursor-pointer"
      >
        保存
      </button>
    </form>
  );
};
