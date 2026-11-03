import React, { useState } from "react";
import { Trash2 } from "lucide-react";

interface MasterListEditorProps {
  title: string;
  items: string[];
  onAdd: (newItem: string) => void;
  onDelete: (item: string) => void;
}

export const MasterListEditor: React.FC<MasterListEditorProps> = ({
  title,
  items,
  onAdd,
  onDelete,
}) => {
  const [inputVal, setInputVal] = useState("");

  return (
    <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-5 rounded-2xl shadow-sm space-y-4 text-[#D94B5A]">
      <h3 className="text-xs font-black text-[#D94B5A] uppercase tracking-wider font-mono border-b border-[#FBCFCB] pb-2">
        {title} ({items.length})
      </h3>

      <div className="flex items-center gap-2">
        <input
          id={`inputval_${title.toLowerCase().replace(/\s+/g, '_')}`}
          name="inputval"
          aria-label={title}
          type="text"
          placeholder={`Add new ${title.toLowerCase()}...`}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          className="flex-1 bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl px-3 py-1.5 text-xs text-[#D94B5A] outline-none focus:border-[#F7AFA8] font-mono"
        />
        <button
          onClick={() => {
            if (inputVal.trim()) {
              onAdd(inputVal.trim());
              setInputVal("");
            }
          }}
          className="px-3 py-1.5 bg-[#F7AFA8] hover:bg-[#D94B5A] text-[#FDE7E6] font-bold text-xs uppercase rounded-xl cursor-pointer transition-colors"
        >
          Add
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
        {items.map((it) => (
          <div
            key={it}
            className="bg-[#FDE7E6] border border-[#FBCFCB] px-3 py-2 rounded-xl flex items-center justify-between text-xs text-[#D94B5A]"
          >
            <span>{it}</span>
            <button
              onClick={() => onDelete(it)}
              className="p-1 text-[#D94B5A] hover:text-rose-800 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
