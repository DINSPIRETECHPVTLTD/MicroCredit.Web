import { useLocation } from "react-router-dom"

function Placeholder() {
  const location = useLocation()
  const segments = location.pathname.split("/").filter(Boolean)
  const title = segments.length ? segments[segments.length - 1].replace(/-/g, " ") : "Page"
  return (
    <div>
      <h1 className="text-2xl font-semibold capitalize">{title}</h1>
      <p className="text-muted-foreground">This page is under construction.</p>
    </div>
  )
}

export default Placeholder
