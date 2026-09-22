import { useEffect, useState } from 'react'
import { EbookUploadTask, type UploadState } from './ebookUpload'
import type { EbookApi } from './ebookApi'
import type { EbookConfig, UploadKind } from './types'

export function useEbookUpload(api: EbookApi, kind: UploadKind, config: EbookConfig) {
  const [task] = useState(() => new EbookUploadTask(api, kind, config))
  const [state, setState] = useState<UploadState>(task.state)
  useEffect(() => {
    const unsubscribe = task.subscribe(setState)
    return () => { unsubscribe(); task.dispose() }
  }, [task])
  return { task, state }
}
