import { Button } from "@/components/ui/button.tsx"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination.tsx"
import { Skeleton } from "@/components/ui/skeleton.tsx"
import { type language, useTranslations } from "@/i18n/ui.ts"
import { cn, fmtString } from "@/lib/utils.ts"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

type MailboxPaginationProps = {
  className?: string
  currentPage: number
  isLoading: boolean
  lang: string
  onPageChange: (page: number) => Promise<void> | void
  totalPages: number
}

type MailboxPaginationSkeletonProps = {
  className?: string
}

type LoadingTarget = "jump-left" | "jump-right" | "next" | "page" | "previous"
type EllipsisKey = "left-ellipsis" | "right-ellipsis"
type PageItem = number | EllipsisKey

type LoadingState = {
  page: number
  target: LoadingTarget
}

const disabledClassName = "pointer-events-none opacity-50"
const mobileMediaQuery = "(max-width: 640px)"
const desktopMaxVisiblePages = 5
const pageJumpDebounceMs = 350
const visiblePagesSkeletonCount = 5

function getVisiblePagesDesktop(
  currentPage: number,
  totalPages: number
): PageItem[] {
  if (totalPages <= desktopMaxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages: PageItem[] = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) {
    pages.push("left-ellipsis")
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (end < totalPages - 1) {
    pages.push("right-ellipsis")
  }

  pages.push(totalPages)

  return pages
}

function getVisiblePagesMobile(
  currentPage: number,
  totalPages: number
): PageItem[] {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 2) {
    return [1, 2, "right-ellipsis", totalPages]
  }

  if (currentPage >= totalPages - 1) {
    return [1, "left-ellipsis", totalPages - 1, totalPages]
  }

  return [1, "left-ellipsis", currentPage, "right-ellipsis", totalPages]
}

function MailboxPaginationSkeleton({
  className,
}: MailboxPaginationSkeletonProps) {
  return (
    <div className={cn("w-full overflow-x-auto pb-1", className)}>
      <div className="mx-auto flex w-fit items-center overflow-hidden rounded-lg border">
        {Array.from({ length: visiblePagesSkeletonCount }, (_, index) => (
          <Skeleton className="h-9 w-9 rounded-none" key={index} />
        ))}
      </div>
    </div>
  )
}

function MailboxPagination({
  className,
  currentPage,
  isLoading,
  lang,
  onPageChange,
  totalPages,
}: MailboxPaginationProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [jumpTarget, setJumpTarget] = useState<EllipsisKey | null>(null)
  const [jumpValue, setJumpValue] = useState("")
  const [loadingTarget, setLoadingTarget] = useState<LoadingState | null>(null)
  const jumpInputRef = useRef<HTMLInputElement | null>(null)
  const isMountedRef = useRef(true)
  const loadingTargetRef = useRef<LoadingState | null>(null)

  const t = useTranslations(lang as language)

  const startPageChange = useCallback(
    (page: number, target: LoadingTarget): void => {
      if (isLoading || loadingTargetRef.current !== null) {
        return
      }

      const nextLoadingTarget = { page, target }
      loadingTargetRef.current = nextLoadingTarget
      setLoadingTarget(nextLoadingTarget)
      setJumpTarget(null)
      setJumpValue("")

      void Promise.resolve()
        .then(() => onPageChange(page))
        .then(
          () => {
            if (
              isMountedRef.current &&
              loadingTargetRef.current === nextLoadingTarget
            ) {
              loadingTargetRef.current = null
              setLoadingTarget(null)
            }
          },
          () => {
            if (
              isMountedRef.current &&
              loadingTargetRef.current === nextLoadingTarget
            ) {
              loadingTargetRef.current = null
              setLoadingTarget(null)
            }
          }
        )
    },
    [isLoading, onPageChange]
  )

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      loadingTargetRef.current = null
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia(mobileMediaQuery)
    const handleMediaQueryChange = (): void => {
      setIsMobile(mediaQuery.matches)
    }

    handleMediaQueryChange()
    mediaQuery.addEventListener("change", handleMediaQueryChange)

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange)
    }
  }, [])

  useEffect(() => {
    if (!jumpTarget || !jumpInputRef.current) {
      return
    }

    jumpInputRef.current.focus()
    jumpInputRef.current.select()
  }, [jumpTarget])

  useEffect(() => {
    if (!jumpTarget || isLoading || loadingTarget) {
      return
    }

    const parsedPage = Number.parseInt(jumpValue, 10)
    if (
      Number.isNaN(parsedPage) ||
      parsedPage < 1 ||
      parsedPage > totalPages ||
      parsedPage === currentPage
    ) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      startPageChange(
        parsedPage,
        jumpTarget === "left-ellipsis" ? "jump-left" : "jump-right"
      )
    }, pageJumpDebounceMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    currentPage,
    isLoading,
    jumpTarget,
    jumpValue,
    loadingTarget,
    startPageChange,
    totalPages,
  ])

  if (totalPages <= 1) {
    return null
  }

  const isPaging = isLoading || loadingTarget !== null
  const canGoPrevious = !isPaging && currentPage > 1
  const canGoNext = !isPaging && currentPage < totalPages
  const visiblePages = isMobile
    ? getVisiblePagesMobile(currentPage, totalPages)
    : getVisiblePagesDesktop(currentPage, totalPages)
  const isPreviousLoading = loadingTarget?.target === "previous"
  const isNextLoading = loadingTarget?.target === "next"

  return (
    <div className={cn("w-full overflow-x-auto pb-1", className)}>
      <Pagination aria-label={t("paginationLabel")} className="min-w-max">
        <PaginationContent className="mx-auto w-fit gap-0 divide-x overflow-hidden rounded-lg border">
          <PaginationItem className="relative">
            <PaginationLink
              href="#"
              size="default"
              aria-busy={isPreviousLoading}
              aria-disabled={!canGoPrevious}
              aria-label={t("previousPage")}
              tabIndex={canGoPrevious ? 0 : -1}
              className={cn(
                "relative h-9 w-auto shrink-0 gap-1 rounded-none border-none px-2 whitespace-nowrap sm:px-3",
                !canGoPrevious && disabledClassName
              )}
              onClick={(event) => {
                event.preventDefault()
                if (canGoPrevious) {
                  startPageChange(currentPage - 1, "previous")
                }
              }}
            >
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  isPreviousLoading && "opacity-0"
                )}
              >
                <ChevronLeft />
                <span className="hidden sm:inline">{t("previousPage")}</span>
              </span>
              {isPreviousLoading && (
                <Loader2 className="pointer-events-none absolute inset-0 m-auto size-4 animate-spin" />
              )}
            </PaginationLink>
          </PaginationItem>
          {visiblePages.map((pageItem) => {
            if (pageItem === "left-ellipsis" || pageItem === "right-ellipsis") {
              const jumpLoadingTarget =
                pageItem === "left-ellipsis" ? "jump-left" : "jump-right"
              const isJumpLoading = loadingTarget?.target === jumpLoadingTarget

              if (jumpTarget === pageItem) {
                return (
                  <PaginationItem key={pageItem}>
                    <input
                      ref={jumpInputRef}
                      aria-label={t("jumpToPage")}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={jumpValue}
                      disabled={isPaging}
                      className="h-9 w-14 rounded-none border-none px-2 text-center text-sm outline-none"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        const rawValue = event.target.value.trim()

                        if (rawValue === "") {
                          setJumpValue("")
                          return
                        }

                        const parsedValue = Number.parseInt(rawValue, 10)
                        if (Number.isNaN(parsedValue)) {
                          return
                        }

                        setJumpValue(
                          String(Math.min(totalPages, Math.max(1, parsedValue)))
                        )
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setJumpTarget(null)
                          setJumpValue("")
                        }

                        if (event.key === "Enter") {
                          const parsedPage = Number.parseInt(jumpValue, 10)
                          if (
                            !Number.isNaN(parsedPage) &&
                            parsedPage >= 1 &&
                            parsedPage <= totalPages &&
                            parsedPage !== currentPage &&
                            !isPaging
                          ) {
                            startPageChange(parsedPage, jumpLoadingTarget)
                          }
                        }
                      }}
                    />
                  </PaginationItem>
                )
              }

              return (
                <PaginationItem key={pageItem}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-busy={isJumpLoading}
                    aria-label={t("morePages")}
                    disabled={isPaging}
                    className={cn(
                      "h-9 w-9 rounded-none border-none",
                      isPaging && disabledClassName
                    )}
                    onClick={() => {
                      if (isPaging) {
                        return
                      }

                      setJumpTarget(pageItem)
                      setJumpValue("")
                    }}
                  >
                    {isJumpLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "..."
                    )}
                  </Button>
                </PaginationItem>
              )
            }

            const isActive = pageItem === currentPage
            const isPageLoading =
              loadingTarget?.target === "page" &&
              loadingTarget.page === pageItem

            return (
              <PaginationItem key={pageItem}>
                <PaginationLink
                  href="#"
                  size="icon"
                  isActive={isActive}
                  aria-busy={isPageLoading}
                  aria-current={isActive ? "page" : undefined}
                  aria-disabled={isPaging}
                  aria-label={fmtString(t("goToPage"), pageItem)}
                  tabIndex={isPaging ? -1 : 0}
                  className={cn(
                    "rounded-none border-none",
                    isPaging && disabledClassName
                  )}
                  onClick={(event) => {
                    event.preventDefault()
                    if (!isPaging && !isActive) {
                      startPageChange(pageItem, "page")
                    }
                  }}
                >
                  {isPageLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    pageItem
                  )}
                </PaginationLink>
              </PaginationItem>
            )
          })}
          <PaginationItem className="relative">
            <PaginationLink
              href="#"
              size="default"
              aria-busy={isNextLoading}
              aria-disabled={!canGoNext}
              aria-label={t("nextPage")}
              tabIndex={canGoNext ? 0 : -1}
              className={cn(
                "relative h-9 w-auto shrink-0 gap-1 rounded-none border-none px-2 whitespace-nowrap sm:px-3",
                !canGoNext && disabledClassName
              )}
              onClick={(event) => {
                event.preventDefault()
                if (canGoNext) {
                  startPageChange(currentPage + 1, "next")
                }
              }}
            >
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  isNextLoading && "opacity-0"
                )}
              >
                <span className="hidden sm:inline">{t("nextPage")}</span>
                <ChevronRight />
              </span>
              {isNextLoading && (
                <Loader2 className="pointer-events-none absolute inset-0 m-auto size-4 animate-spin" />
              )}
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export { MailboxPaginationSkeleton }
export default MailboxPagination
