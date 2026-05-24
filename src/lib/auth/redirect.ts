/** Full navigation to login (used when session expires outside React Router). */
export function redirectToLogin(): void {
  if (window.location.pathname !== "/login") {
    window.location.replace("/login")
  }
}
