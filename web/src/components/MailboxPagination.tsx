import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination.tsx"
import { type language, useTranslations } from "@/i18n/ui.ts"
import { cn, fmtString } from "@/lib/utils.ts"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type MailboxPaginationProps = {
  currentPage: number
  isLoading: boolean
  lang: string
  onPageChange: (page: number) => Promise<void>
  totalPages: number
}

type LoadingTarget = {
  page: number
  type: "next" | "page" | "previous"
}

type PageItem = number | "left-ellipsis" | "right-ellipsis"

const disabledClassName = "pointer-events-none opacity-50"
const mobileMediaQuery = "(max-width: 640px)"

function getDesktopPages(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
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

function getMobilePages(currentPage: number, totalPages: number): PageItem[] {
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

function MailboxPagination({
  currentPage,
  isLoading,
  lang,
  onPageChange,
  totalPages,
}: MailboxPaginationProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [loadingTarget, setLoadingTarget] = useState<LoadingTarget | null>(null)
  const t = useTranslations(lang as language)

  useEffect(() => {
    const mediaQuery = window.matchMedia(mobileMediaQuery)
    const updateViewport = () => setIsMobile(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener("change", updateViewport)
    return () => mediaQuery.removeEventListener("change", updateViewport)
  }, [])

  const visiblePages = useMemo(
    () =>
      isMobile
        ? getMobilePages(currentPage, totalPages)
        : getDesktopPages(currentPage, totalPages),
    [currentPage, isMobile, totalPages]
  )

  if (totalPages <= 1) {
    return null
  }

  const isPaging = isLoading || loadingTarget !== null
  const canGoPrevious = !isPaging && currentPage > 1
  const canGoNext = !isPaging && currentPage < totalPages

  async function changePage(page: number, type: LoadingTarget["type"]) {
    if (isPaging || page === currentPage || page < 1 || page > totalPages) {
      return
    }

    setLoadingTarget({ page, type })
    try {
      await onPageChange(page)
    } finally {
      setLoadingTarget(null)
    }
  }

  return (
    <Pagination aria-label={t("paginationLabel")} className="min-w-max">
      <PaginationContent className="mx-auto w-fit gap-0 divide-x overflow-hidden rounded-md border">
        <PaginationItem className="relative">
          <PaginationLink
            data-testid="mail-pagination-previous"
            href="#"
            size="default"
            aria-label={t("previousPage")}
            aria-busy={loadingTarget?.type === "previous"}
            aria-disabled={!canGoPrevious}
            className={cn(
              "h-9 min-w-9 shrink-0 rounded-none border-0 px-2 sm:px-3",
              !canGoPrevious && disabledClassName,
              loadingTarget?.type === "previous" &&
                "[&>span]:opacity-0 [&>svg]:opacity-0"
            )}
            onClick={(event) => {
              event.preventDefault()
              if (canGoPrevious) {
                void changePage(currentPage - 1, "previous")
              }
            }}
          >
            <ChevronLeft aria-hidden="true" />
            <span className="hidden sm:inline">{t("previousPage")}</span>
          </PaginationLink>
          {loadingTarget?.type === "previous" && (
            <Loader2
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 m-auto size-4 animate-spin"
              data-testid="mail-pagination-previous-spinner"
            />
          )}
        </PaginationItem>

        {visiblePages.map((pageItem) => {
          if (typeof pageItem !== "number") {
            return (
              <PaginationItem key={pageItem}>
                <PaginationEllipsis className="rounded-none" />
              </PaginationItem>
            )
          }

          const isActive = pageItem === currentPage
          const isPageLoading =
            loadingTarget?.type === "page" && loadingTarget.page === pageItem

          return (
            <PaginationItem key={pageItem}>
              <PaginationLink
                data-testid={`mail-pagination-page-${pageItem}`}
                href="#"
                size="icon"
                isActive={isActive}
                aria-label={fmtString(t("goToPage"), pageItem)}
                aria-busy={isPageLoading}
                aria-disabled={isPaging || isActive}
                className={cn(
                  "rounded-none border-0",
                  isPaging && disabledClassName
                )}
                onClick={(event) => {
                  event.preventDefault()
                  if (!isActive && !isPaging) {
                    void changePage(pageItem, "page")
                  }
                }}
              >
                {isPageLoading ? (
                  <Loader2
                    aria-hidden="true"
                    className="size-4 animate-spin"
                    data-testid={`mail-pagination-page-${pageItem}-spinner`}
                  />
                ) : (
                  pageItem
                )}
              </PaginationLink>
            </PaginationItem>
          )
        })}

        <PaginationItem className="relative">
          <PaginationLink
            data-testid="mail-pagination-next"
            href="#"
            size="default"
            aria-label={t("nextPage")}
            aria-busy={loadingTarget?.type === "next"}
            aria-disabled={!canGoNext}
            className={cn(
              "h-9 min-w-9 shrink-0 rounded-none border-0 px-2 sm:px-3",
              !canGoNext && disabledClassName,
              loadingTarget?.type === "next" &&
                "[&>span]:opacity-0 [&>svg]:opacity-0"
            )}
            onClick={(event) => {
              event.preventDefault()
              if (canGoNext) {
                void changePage(currentPage + 1, "next")
              }
            }}
          >
            <span className="hidden sm:inline">{t("nextPage")}</span>
            <ChevronRight aria-hidden="true" />
          </PaginationLink>
          {loadingTarget?.type === "next" && (
            <Loader2
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 m-auto size-4 animate-spin"
              data-testid="mail-pagination-next-spinner"
            />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

export default MailboxPagination
