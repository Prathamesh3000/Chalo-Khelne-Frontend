import { cn } from "../lib";

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-gray-200/70", className)} />;
}

export default Skeleton;
