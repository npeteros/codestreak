interface Props {
  code: string;
  label?: string;
}

// Read-only starter-code pane for guest-facing challenge pages — same shell
// styling as the interactive editor in ChallengeClient/PracticeChallengeClient,
// minus the textarea/submit controls.
export function CodeViewer({ code, label = "starter code" }: Props) {
  return (
    <div className="flex-[1.3_1_340px] min-w-[300px] flex flex-col border border-white/[0.08] rounded-[15px] overflow-hidden bg-code-bg">
      <div className="flex items-center justify-between px-[15px] py-[11px] bg-[#131316] border-b border-white/[0.07]">
        <div className="flex items-center gap-[9px]">
          <span className="w-[9px] h-[9px] rounded-full bg-gold inline-block" />
          <span className="font-mono text-[12.5px] text-[#D7D5CE]">{label}</span>
        </div>
      </div>

      <pre className="flex-1 min-h-[230px] w-full m-0 overflow-auto bg-code-bg text-[#EDEBE4] font-mono text-[13px] leading-[1.75] px-[18px] py-[16px] whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}
