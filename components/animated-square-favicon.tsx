"use client"

import { useEffect, useRef } from "react"

const AnimatedSquareFavicon = () => {
    const faviconRef = useRef<HTMLLinkElement | null>(null)

    useEffect(() => {
        // Create a link element for the favicon if it doesn't exist
        if (!faviconRef.current) {
            const link = document.createElement("link")
            link.rel = "icon"
            link.type = "image/svg+xml"
            document.head.appendChild(link)
            faviconRef.current = link
        }

        // Define the color palette
        const colors = ["#ffff66", "#42ffff", "#51da4c", "#ff6e3c", "#3c46ff"]
        let currentColorIndex = 0

        const animate = () => {
            if (!faviconRef.current) return

            // Get the current color from the palette
            const color = colors[currentColorIndex]

            // Create a square SVG
            const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
          <rect width="32" height="32" fill="${color}" />
        </svg>
      `

            // Update the favicon with the new SVG
            faviconRef.current.href = `data:image/svg+xml;base64,${btoa(svg)}`

            // Increment the color index
            currentColorIndex = (currentColorIndex + 1) % colors.length
        }

        // Run the animation at 1fps (change color every second)
        const intervalId = setInterval(animate, 1000)

        // Clean up the interval when the component unmounts
        return () => clearInterval(intervalId)
    }, [])

    return null
}

export default AnimatedSquareFavicon