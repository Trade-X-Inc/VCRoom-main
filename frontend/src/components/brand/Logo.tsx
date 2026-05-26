export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  if (withWordmark) {
    return (
      <div className="inline-flex items-center">
        <img
          src="/logo-dark.svg"
          alt="Hockeystick"
          className="h-8 dark:hidden"
        />
        <img
          src="/logo-light.svg"
          alt="Hockeystick"
          className="h-8 hidden dark:block"
        />
      </div>
    );
  }
  return (
    <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600">
      <span className="text-white text-sm font-bold">H</span>
    </div>
  );
}
