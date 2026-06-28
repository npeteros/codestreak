export function Logomark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={className}
    >
      <polygon points="15,80 30,80 38,52 23,52" fill="#F5C842" />
      <polygon points="39,80 54,80 62,38 47,38" fill="#F5C842" />
      <polygon points="63,80 78,80 86,20 71,20" fill="#F5C842" />
    </svg>
  );
}
