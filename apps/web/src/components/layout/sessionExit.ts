// AlgorithmPage owns whether leaving now should show the session-end
// survey first (it knows the active DB session id). The workspace top bar
// never navigates directly: every way out (the back button, the breadcrumb,
// the search palette, the account menu) sends this event with where it wants
// to go, and AlgorithmPage navigates there once the survey is done.
export const REQUEST_SESSION_EXIT_EVENT = 'dsa-tutor:request-session-exit'

export interface SessionExitDetail {
  /** Where to go after the exit; Home when omitted. */
  to?: string
}

export function requestSessionExit(to?: string) {
  window.dispatchEvent(new CustomEvent<SessionExitDetail>(REQUEST_SESSION_EXIT_EVENT, { detail: { to } }))
}
