import { useLocation } from "react-router-dom"

function Placeholder() {
  const location = useLocation()
  const segments = location.pathname.split("/").filter(Boolean)
  const title = segments.length ? segments[segments.length - 1].replace(/-/g, " ") : "Page"
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title capitalize">{title}</h1>
      </div>
      <p className="text-muted-foreground">This page is under construction.</p>
    </div>
  )
}

export default Placeholder
