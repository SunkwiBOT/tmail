import Actions from "@/components/Actions.tsx"
import Detail from "@/components/Detail.tsx"
import MailboxPagination from "@/components/MailboxPagination.tsx"
import Mounted from "@/components/Mounted.tsx"
import { Skeleton } from "@/components/ui/skeleton.tsx"
import { type language, useTranslations } from "@/i18n/ui.ts"
import { ABORT_SAFE } from "@/lib/constant.ts"
import { $address, initStore } from "@/lib/store/store.ts"
import type { Envelope, FetchPage, FetchPagination } from "@/lib/types.ts"
import {
  apiFetch,
  fetchError,
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
  RotateCw,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

const pageSize = 10
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

function Content({ lang }: { lang: string }) {
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [envelopes, setEnvelopes] = useState<Envelope[]>([])
  const [pagination, setPagination] =
    useState<FetchPagination>(initialPagination)
  const controller = useRef<AbortController | null>(null)
  const currentPage = useRef(1)
  const list = useRef<HTMLDivElement | null>(null)

  const address = useStore($address)

  const t = useMemo(() => useTranslations(lang as language), [lang])

  useEffect(() => {
    apiFetch<string[]>("/api/domain")
      .then((domainList) => initStore(domainList))
      .catch(fetchError)
  }, [])

  useEffect(() => {
    if (!address) {
      return
    }

    const currentController = new AbortController()
    controller.current = currentController
    let latestId = 0

    async function pollLatest() {
      while (!currentController.signal.aborted) {
        try {
          const params = new URLSearchParams({
            to: address,
            id: String(latestId),
          })
          const res = await fetch(`/api/fetch/latest?${params}`, {
            signal: currentController.signal,
          })
          if (res.status === 204) {
            continue
          }

          const envelope = await unwrapApi<Envelope>(res)
          if (currentController.signal.aborted || envelope.id <= latestId) {
            continue
          }

          latestId = envelope.id
          envelope.animate = true
          if (currentPage.current === 1) {
            setEnvelopes((current) =>
              [
                envelope,
                ...current.filter((item) => item.id !== envelope.id),
              ].slice(0, pageSize)
            )
          }
          setPagination((current) => {
            const total = current.total + 1
            return {
              ...current,
              total,
              total_pages: Math.max(1, Math.ceil(total / pageSize)),
            }
          })
          toast.success(fmtString(t("receiveNew"), envelope.from))
        } catch (error) {
          if (currentController.signal.aborted) {
            return
          }
          fetchError(error)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    }

    async function start() {
      try {
        const result = await fetchMailboxPage(
          address,
          1,
          currentController.signal
        )
        if (currentController.signal.aborted) {
          return
        }

        latestId = result.envelopes[0]?.id ?? 0
        currentPage.current = result.pagination.page
        setEnvelopes(result.envelopes)
        setPagination(result.pagination)
        void pollLatest()
      } catch (error) {
        if (!currentController.signal.aborted) {
          fetchError(error)
        }
      } finally {
        if (!currentController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    setLoading(true)
    setPageLoading(false)
    setEnvelopes([])
    setPagination(initialPagination)
    currentPage.current = 1
    void start()

    return () => {
      currentController.abort(ABORT_SAFE)
      if (controller.current === currentController) {
        controller.current = null
      }
    }
  }, [address, lang])

  async function changePage(page: number) {
    const currentController = controller.current
    if (!address || !currentController || pageLoading) {
      return
    }

    setPageLoading(true)
    try {
      const result = await fetchMailboxPage(
        address,
        page,
        currentController.signal
      )
      if (
        currentController.signal.aborted ||
        controller.current !== currentController
      ) {
        return
      }

      currentPage.current = result.pagination.page
      setEnvelopes(result.envelopes)
      setPagination(result.pagination)
      list.current?.scrollTo({ top: 0 })
    } catch (error) {
      if (!currentController.signal.aborted) {
        fetchError(error)
      }
    } finally {
      if (controller.current === currentController) {
        setPageLoading(false)
      }
    }
  }

  function copyToClipboard() {
    navigator.clipboard
      .writeText(address)
      .then(() => toast.success(t("copy") + " " + address))
      .catch((e) => toast.error(e.message ?? e))
  }

  const hasPagination = !loading && pagination.total_pages > 1

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
          <div
            onClick={copyToClipboard}
            className="hover:bg-sidebar flex items-center self-stretch transition-colors hover:cursor-pointer hover:border-r"
          >
            <ClipboardCopy className="mx-2" size={20} strokeWidth={1.8} />
          </div>
          <div className="flex-1" />
          <div className="text-muted-foreground hidden font-medium sm:inline">
            {t("realTime")}
          </div>
          <Loader size={20} strokeWidth={1.8} className="mx-2 animate-spin" />
        </div>
      </div>
      <div
        ref={list}
        className={clsx(
          "min-h-0 divide-y overflow-y-auto border",
          hasPagination ? "border-b-0" : "rounded-b-sm"
        )}
      >
        {envelopes.length === 0 && (
          <div className="text-muted-foreground flex items-center justify-center gap-1 py-5.5">
            {loading ? (
              <>
                <RotateCw className="animate-spin" size={20} />
                <span>{t("listLoading")}</span>
              </>
            ) : (
              <>
                <Frown size={20} />
                <span>{t("listEmpty")}</span>
              </>
            )}
          </div>
        )}
        {envelopes.map((envelope) => (
          <Detail lang={lang} key={envelope.id} envelope={envelope}>
            <div
              className={clsx(
                "hover:bg-secondary group text-muted-foreground space-y-1 px-4 py-2 transition-colors duration-300 hover:cursor-pointer",
                envelope.animate && "animate-in slide-in-from-right"
              )}
            >
              <div className="flex items-center">
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
            </div>
          </Detail>
        ))}
      </div>
      {hasPagination && (
        <div className="rounded-b-sm border px-3 py-3">
          <MailboxPagination
            currentPage={pagination.page}
            isLoading={pageLoading}
            lang={lang}
            onPageChange={changePage}
            totalPages={pagination.total_pages}
          />
        </div>
      )}
      <div className="flex-1" />
    </div>
  )
}

export default Content
