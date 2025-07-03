import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false) // Default to false (desktop)

  React.useEffect(() => {
    // This function checks the screen width and updates the state.
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Check the size on component mount (after hydration)
    checkScreenSize()

    // Add event listener for window resize
    window.addEventListener("resize", checkScreenSize)

    // Cleanup the event listener on component unmount
    return () => window.removeEventListener("resize", checkScreenSize)
  }, []) // Empty dependency array means this effect runs only once on mount

  return isMobile
}
