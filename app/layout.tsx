import type React from "react"
import type { Metadata } from "next"
import { Courier_Prime } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import AnimatedSquareFavicon from "@/components/animated-square-favicon"

const courier = Courier_Prime({
  subsets: ["latin"],
  weight: "400"
})

export const metadata: Metadata = {
  title: "ImageGen",
  description: "DALL·E 2 and GPT-4o (Gpt Image 1) image generation",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <AnimatedSquareFavicon />
      </head>
      <body className={courier.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
