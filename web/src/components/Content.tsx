import Actions from "@/components/Actions.tsx"
import Detail from "@/components/Detail.tsx"
import MailboxPagination, {
  MailboxPaginationSkeleton,
} from "@/components/MailboxPagination.tsx"
import Mounted from "@/components/Mounted.tsx"
import { Button } from "@/components/ui/button.tsx"
import { Skeleton } from "@/components/ui/skeleton.tsx"
import { toast } from "@/components/ui/toast"
import { type language, useTranslations } from "@/i18n/ui.ts"
import { ABORT_SAFE } from "@/lib/constant.ts"
import { fetchError } from "@/lib/fetch-error.ts"
import { $address, initStore } from "@/lib/store/store.ts"
import type { Envelope, FetchPage, FetchPagination } from "@/lib/types.ts"
import usePaginatedCollection from "@/lib/use-paginated-collection.ts"
import {
  apiFetch,
  fmtDate,
  fmtFrom,
  fmtString,
  unwrapApi,
} from "@/lib/utils.ts"
import { useStore } from "@nanostores/react"
import { clsx } from "clsx"
import {
  ClipboardCopy,
  ExternalLink,
  Frown,
  Loader,
  RefreshCw,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

const pageSize = 10
const initialRetryDelayMs = 2_000
const maxRetryDelayMs = 30_000
const skeletonRows = 5
const initialPagination: FetchPagination = {
  page: 1,
  total: 0,
  total_pages: 1,
}

function fetchMailboxPage(address: string, page: number, signal: AbortSignal) {
  const params = new URLSearchParams({
    to: address,
    page: String(page),
  })
  return apiFetch<FetchPage>(`/api/fetch/page?${params}`, { signal })
}

function MailboxListSkeleton() {
  return (
    <>
      {Array.from({ length: skeletonRows }, (_, index) => (
        <div aria-hidden={true} className="space-y-2 px-4 py-3" key={index}>
          <Skeleton className="h-4 w-2/3" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </>
  )
}

function Content({ lang }: { lang: string }) {
  const [ready, setReady] = useState(false)
  const address = useStore($address)
  const listRef = useRef<HTMLDivElement | null>(null)
  const currentPageRef = useRef(1)
  const knownIdsRef = useRef<Set<number>>(new Set())
  const t = useTranslations(lang as language)

  const fetchPage = useCallback(
    async (page: number, signal: AbortSignal) => {
      const result = await fetchMailboxPage(address!, page, signal)
      return {
        items: result.envelopes,
        pagination: result.pagination,
      }
    },
    [address]
  )

  const {
    hasLoadedTotal,
    isLoading,
    items: envelopes,
    loadError,
    loadPage,
    pagination,
    reset,
    setItems,
    setPagination,
  } = usePaginatedCollection<Envelope, number, FetchPagination>({
    fetchPage,
    initialPagination,
    onError: fetchError,
  })

  useEffect(() => {
    currentPageRef.current = pagination.page
  }, [pagination.page])

  useEffect(() => {
    const onReady = () => setReady(true)
    if (document.body.hasAttribute("data-turnstile-verified")) {
      onReady()
      return
    }

    document.addEventListener("tmail:ready", onReady, { once: true })
    return () => document.removeEventListener("tmail:ready", onReady)
  }, [])

  useEffect(() => {
    if (!ready) {
      return
    }

    apiFetch<string[]>("/api/domain")
      .then((domainList) => initStore(domainList))
      .catch(fetchError)
  }, [ready])

  useEffect(() => {
    if (!ready || !address) {
      return
    }

    const pollController = new AbortController()
    let latestId = 0

    async function poll() {
      let retryDelay = initialRetryDelayMs
      while (!pollController.signal.aborted) {
        try {
          const params = new URLSearchParams({
            to: address,
            id: String(latestId),
          })
          const res = await fetch(`/api/fetch/latest?${params}`, {
            signal: pollController.signal,
          })
          if (pollController.signal.aborted) {
            return
          }
          if (res.status === 401) {
            setReady(false)
            document.dispatchEvent(new Event("tmail:verification-expired"))
            return
          }
          if (res.status === 204) {
            retryDelay = initialRetryDelayMs
            continue
          }

          const envelope = await unwrapApi<Envelope>(res)
          if (pollController.signal.aborted) {
            return
          }
          retryDelay = initialRetryDelayMs
          latestId = Math.max(latestId, envelope.id)
          if (knownIdsRef.current.has(envelope.id)) {
            continue
          }

          knownIdsRef.current.add(envelope.id)
          envelope.animate = true
          setItems((current) => {
            const deduped = current.filter((item) => item.id !== envelope.id)
            if (currentPageRef.current === 1) {
              return [envelope, ...deduped].slice(0, pageSize)
            }
            return deduped
          })
          setPagination((current) => {
            const total = current.total + 1
            return {
              ...current,
              total,
              total_pages: Math.max(1, Math.ceil(total / pageSize)),
            }
          })
          toast.add({
            title: fmtString(t("receiveNew"), envelope.from),
            type: "success",
          })
        } catch (error) {
          if (pollController.signal.aborted) {
            return
          }
          fetchError(error)
          const delay = retryDelay + Math.random() * 500
          await new Promise((resolve) => setTimeout(resolve, delay))
          retryDelay = Math.min(retryDelay * 2, maxRetryDelayMs)
        }
      }
    }

    async function start() {
      const result = await loadPage(1)
      if (!result || pollController.signal.aborted) {
        return
      }

      knownIdsRef.current = new Set(result.items.map((item) => item.id))
      latestId = result.items[0]?.id ?? 0
      void poll()
    }

    reset()
    knownIdsRef.current = new Set()
    void start()

    return () => {
      pollController.abort(ABORT_SAFE)
    }
  }, [address, lang, loadPage, ready, reset, setItems, setPagination])

  const changePage = useCallback(
    async (page: number) => {
      const result = await loadPage(page)
      if (!result) {
        return
      }

      for (const envelope of result.items) {
        knownIdsRef.current.add(envelope.id)
      }
      listRef.current?.scrollTo({ top: 0 })
    },
    [loadPage]
  )

  const retry = useCallback(() => {
    void loadPage(pagination.page)
  }, [loadPage, pagination.page])

  function copyToClipboard() {
    navigator.clipboard
      .writeText(address)
      .then(() =>
        toast.add({ title: t("copy") + " " + address, type: "success" })
      )
      .catch((e) => toast.add({ title: e.message ?? String(e), type: "error" }))
  }

  const showInitialSkeleton =
    !loadError && (!ready || (!hasLoadedTotal && isLoading))
  const hasPagination = hasLoadedTotal && pagination.total_pages > 1
  const showPaginationArea = showInitialSkeleton || hasPagination
  const showLoadError = loadError && envelopes.length === 0 && !isLoading
  const showEmpty =
    !showInitialSkeleton && envelopes.length === 0 && !showLoadError

  return (
    <div className="flex w-full flex-col pb-4">
      <div className="block sm:hidden">
        <Actions lang={lang} />
      </div>
      <div className="relative border-x">
        <div className="animate-fill absolute h-1 bg-green-400" />
        <div className="flex flex-wrap items-center">
          <div className="bg-sidebar flex h-12 items-center border-r px-4">
            <Mounted fallback={<Skeleton className="h-6 w-48" />}>
              <span className="font-mono font-semibold">{address}</span>
            </Mounted>
          </div>
          <button
            type="button"
            aria-label={t("copyAddress")}
            onClick={copyToClipboard}
            className="hover:bg-sidebar flex items-center self-stretch border-0 bg-transparent transition-colors hover:cursor-pointer hover:border-r"
          >
            <ClipboardCopy className="mx-2" size={20} strokeWidth={1.8} />
          </button>
          <div className="flex-1" />
          <div className="text-muted-foreground hidden font-medium sm:inline">
            {t("realTime")}
          </div>
          <Loader size={20} strokeWidth={1.8} className="mx-2 animate-spin" />
        </div>
      </div>
      <div
        ref={listRef}
        aria-busy={isLoading}
        className={clsx(
          "min-h-0 divide-y overflow-y-auto border",
          showPaginationArea ? "border-b-0" : "rounded-b-sm"
        )}
      >
        {showInitialSkeleton ? (
          <MailboxListSkeleton />
        ) : showLoadError ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-6">
            <Frown size={20} />
            <span>{t("listLoadError")}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              <RefreshCw />
              {t("retry")}
            </Button>
          </div>
        ) : showEmpty ? (
          <div className="text-muted-foreground flex items-center justify-center gap-1 py-5.5">
            <Frown size={20} />
            <span>{t("listEmpty")}</span>
          </div>
        ) : (
          envelopes.map((envelope) => (
            <Detail lang={lang} key={envelope.id} envelope={envelope}>
              <button
                type="button"
                className={clsx(
                  "hover:bg-secondary group text-muted-foreground block w-full bg-transparent px-4 py-2 text-left transition-colors duration-300 hover:cursor-pointer",
                  envelope.animate && "animate-in slide-in-from-right"
                )}
              >
                <div className="flex items-center space-y-1">
                  <span className="text-foreground">{envelope.subject}</span>
                  <ExternalLink
                    size={16}
                    className="invisible mx-2 hidden group-hover:visible sm:block"
                  />
                  <div className="flex-1" />
                  {envelope.to != address && <span>{envelope.to}</span>}
                </div>
                <div className="flex justify-between text-sm">
                  <div className="truncate">{fmtFrom(envelope.from)}</div>
                  <div className="shrink-0">{fmtDate(envelope.created_at)}</div>
                </div>
              </button>
            </Detail>
          ))
        )}
      </div>
      {showInitialSkeleton ? (
        <div className="rounded-b-sm border px-3 py-3">
          <MailboxPaginationSkeleton />
        </div>
      ) : hasPagination ? (
        <div className="rounded-b-sm border px-3 py-3">
          <MailboxPagination
            currentPage={pagination.page}
            isLoading={isLoading}
            lang={lang}
            onPageChange={changePage}
            totalPages={pagination.total_pages}
          />
        </div>
      ) : null}
      <div className="flex-1" />
    </div>
  )
}

export default Content
