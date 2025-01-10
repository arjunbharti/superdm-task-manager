import { cn } from "@/lib/utils";

const MaxWidthWrapper = ({ className, children }: { className?: string, children: React.ReactNode }) => {
  return (
    <main className={cn('mx-auto w-full max-w-screen-xl px-2.5 md:px-20', className)}>
      {children}
    </main>
  )
}

export default MaxWidthWrapper;