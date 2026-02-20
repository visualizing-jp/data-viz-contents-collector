"use client";

import { useTransition } from "react";
import { toggleStarred } from "@/lib/actions/contents";

export function StarButton({ id, starred }: { id: number; starred: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        startTransition(() => toggleStarred(id, !starred));
      }}
      disabled={isPending}
      className="absolute top-1.5 right-1.5 rounded-md w-7 h-7 flex items-center justify-center bg-white/80 hover:bg-white transition-colors shadow-sm"
      title={starred ? "☆をはずす" : "☆をつける"}
    >
      <span className={`text-base leading-none ${starred ? "text-yellow-400" : "text-gray-300 hover:text-yellow-300"}`}>
        ★
      </span>
    </button>
  );
}
