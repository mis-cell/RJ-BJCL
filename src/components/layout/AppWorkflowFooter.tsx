import React from 'react';
import { cn } from '../../lib/utils';
import { Page, JCI_WORKFLOW_STEPS } from '../../config/navigationConfig';
import { hasModulePermission } from '../../lib/permissions';

export interface AppWorkflowFooterProps {
  isOnline: boolean;
  allowedModules: string[];
  isAdmin: boolean;
  currentPage: Page;
  globalNavigate: (page: Page) => void;
  onLogout: () => void;
}

export const AppWorkflowFooter: React.FC<AppWorkflowFooterProps> = ({
  isOnline,
  allowedModules,
  isAdmin,
  currentPage,
  globalNavigate,
  onLogout,
}) => {
  return (
    <div className="bg-[#F7AFA8] border-t-2 border-[#FBCFCB] px-3 py-1.5 flex justify-between items-center text-white shrink-0 shadow-2xl z-40 gap-3 w-full min-w-0">
      {/* Left Section: Online status & JCI Arrow-Wise Workflow Guide */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1 min-w-0">
        {/* System Online Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#D94B5A] rounded-md border border-[#FBCFCB] text-[#FDE7E6] shrink-0">
          <div
            className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isOnline ? "bg-emerald-300 shadow-xs" : "bg-yellow-300"
            )}
          />
          <span
            className={cn(
              "uppercase tracking-wider font-mono font-bold text-[10px]",
              isOnline ? "text-emerald-200" : "text-amber-200"
            )}
          >
            {isOnline ? 'SYSTEM ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <div className="h-5 w-px bg-[#FBCFCB]/50 shrink-0" />

        {/* JCI Software Process Workflow Arrow Guide */}
        <div className="flex items-center gap-1.5 shrink-0 bg-[#D94B5A] px-2 py-0.5 rounded-lg border border-[#FBCFCB]/80 shadow-inner">
          <div className="flex items-center gap-1 shrink-0">
            {(() => {
              const permittedWorkflowSteps = JCI_WORKFLOW_STEPS.filter(
                (step) =>
                  hasModulePermission(step.pageId, allowedModules, isAdmin) ||
                  step.matchPages.some((p) =>
                    hasModulePermission(p, allowedModules, isAdmin)
                  )
              );

              if (permittedWorkflowSteps.length === 0) return null;

              const activeStepIdx = permittedWorkflowSteps.findIndex((step) =>
                step.matchPages.includes(currentPage)
              );

              return permittedWorkflowSteps.map((step, idx) => {
                const isCurrent = step.matchPages.includes(currentPage);
                const isPast = activeStepIdx !== -1 && idx < activeStepIdx;
                const IconComp = step.icon;

                return (
                  <React.Fragment key={step.stepNumber}>
                    <button
                      type="button"
                      onClick={() => globalNavigate(step.pageId)}
                      title={`Step ${step.stepNumber}: ${step.title} — ${step.desc} (Click to Navigate)`}
                      className={cn(
                        "group/step flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-150 cursor-pointer shrink-0 border select-none",
                        isCurrent
                          ? "bg-[#FBCFCB] border-[#FDE7E6] text-white font-black shadow-md ring-2 ring-[#FBCFCB]/60 scale-[1.02]"
                          : isPast
                          ? "bg-[#E85A5A] border-[#F48F8B] text-[#FDE7E6] hover:bg-[#C23A4A] hover:text-white font-bold"
                          : "bg-[#D94B5A] border-[#F7AFA8] text-[#FBCFCB] hover:bg-[#E85A5A] hover:text-white font-medium"
                      )}
                    >
                      <span
                        className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-black shrink-0",
                          isCurrent
                            ? "bg-white text-[#D94B5A]"
                            : isPast
                            ? "bg-[#FBCFCB] text-white"
                            : "bg-[#F7AFA8] text-[#FDE7E6] border border-[#F48F8B]"
                        )}
                      >
                        {step.stepNumber}
                      </span>
                      <IconComp
                        className={cn(
                          "w-3 h-3 shrink-0",
                          isCurrent
                            ? "text-white"
                            : isPast
                            ? "text-[#FDE7E6]"
                            : "text-[#FBCFCB]"
                        )}
                      />
                      <span className="text-[11px] whitespace-nowrap tracking-tight font-bold">
                        {step.title}
                      </span>
                    </button>

                    {/* Arrow separator */}
                    {idx < permittedWorkflowSteps.length - 1 && (
                      <div className="flex items-center text-[#FDE7E6] px-0.5 shrink-0">
                        <span className="text-[12px] font-black text-[#FDE7E6]">➔</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Right Section: Logout */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#D94B5A] hover:bg-[#D94B5A] rounded-md border border-[#FBCFCB] text-[#FDE7E6] hover:text-white transition-colors text-[10px] font-extrabold uppercase tracking-wider shrink-0 cursor-pointer"
          title="Sign out of Bally Jute Company desk"
        >
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
