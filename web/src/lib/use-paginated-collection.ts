import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

export type PaginatedCollectionPage<ItemType, PaginationType> = {
  items: ItemType[]
  pagination: PaginationType
}

type PaginatedCollectionFetcher<ItemType, RequestType, PaginationType> = (
  request: RequestType,
  signal: AbortSignal
) => Promise<PaginatedCollectionPage<ItemType, PaginationType>>

type UsePaginatedCollectionOptions<ItemType, RequestType, PaginationType> = {
  fetchPage: PaginatedCollectionFetcher<ItemType, RequestType, PaginationType>
  initialPagination: PaginationType
  onError: (error: unknown) => void
}

export type UsePaginatedCollectionResult<
  ItemType,
  RequestType,
  PaginationType,
> = {
  cancel: () => void
  hasLoadedTotal: boolean
  isLoading: boolean
  items: ItemType[]
  loadError: boolean
  loadPage: (
    request: RequestType
  ) => Promise<PaginatedCollectionPage<ItemType, PaginationType> | null>
  pagination: PaginationType
  reset: () => void
  setItems: Dispatch<SetStateAction<ItemType[]>>
  setPagination: Dispatch<SetStateAction<PaginationType>>
}

const usePaginatedCollection = <ItemType, RequestType, PaginationType>({
  fetchPage,
  initialPagination,
  onError,
}: UsePaginatedCollectionOptions<
  ItemType,
  RequestType,
  PaginationType
>): UsePaginatedCollectionResult<ItemType, RequestType, PaginationType> => {
  const [items, setItems] = useState<ItemType[]>([])
  const [pagination, setPagination] =
    useState<PaginationType>(initialPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedTotal, setHasLoadedTotal] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  const cancel = useCallback((): void => {
    requestIdRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsLoading(false)
  }, [])

  const reset = useCallback((): void => {
    cancel()
    setItems([])
    setPagination(initialPagination)
    setHasLoadedTotal(false)
    setLoadError(false)
  }, [cancel, initialPagination])

  const loadPage = useCallback(
    async (
      request: RequestType
    ): Promise<PaginatedCollectionPage<ItemType, PaginationType> | null> => {
      abortControllerRef.current?.abort()
      const abortController = new AbortController()
      const requestId = requestIdRef.current + 1

      requestIdRef.current = requestId
      abortControllerRef.current = abortController
      setIsLoading(true)
      setLoadError(false)

      try {
        const result = await fetchPage(request, abortController.signal)

        if (
          abortController.signal.aborted ||
          requestIdRef.current !== requestId
        ) {
          return null
        }

        setItems(result.items)
        setPagination(result.pagination)

        return result
      } catch (error) {
        if (
          abortController.signal.aborted ||
          requestIdRef.current !== requestId
        ) {
          return null
        }

        setLoadError(true)
        onError(error)

        return null
      } finally {
        if (requestIdRef.current === requestId) {
          abortControllerRef.current = null
          setHasLoadedTotal(true)
          setIsLoading(false)
        }
      }
    },
    [fetchPage, onError]
  )

  useEffect(() => {
    return () => {
      requestIdRef.current += 1
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    }
  }, [])

  return {
    cancel,
    hasLoadedTotal,
    isLoading,
    items,
    loadError,
    loadPage,
    pagination,
    reset,
    setItems,
    setPagination,
  }
}

export default usePaginatedCollection
