import { useState } from 'react'

/** Runs an auth call for a form: tracks pending, banner error and field errors. */
export function useAuthForm() {
  const [pending, setPending] = useState(false)
  const [state, setState] = useState({ error: '', fieldErrors: {} })
  async function submit(fn) {
    setPending(true)
    setState({ error: '', fieldErrors: {} })
    try { return await fn() } catch (err) {
      setState({ error: err.fieldErrors && Object.keys(err.fieldErrors).length ? err.error || '' : err.error || err.message, fieldErrors: err.fieldErrors || {} })
      return undefined
    } finally { setPending(false) }
  }
  return { pending, error: state.error, fieldErrors: state.fieldErrors, submit }
}
