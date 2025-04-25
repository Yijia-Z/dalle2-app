import type React from "react"
import type { Metadata } from "next"
import { Inter, Montserrat, Merriweather } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import AnimatedSquareFavicon from "@/components/animated-square-favicon"

const inter = Merriweather({
  subsets: ["latin"],
  weight: "400"
})

export const metadata: Metadata = {
  title: "OpenAI ImageGen",
  description: "DALL·E 2 and GPT-4o image generation",
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
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
