"use client"
import { HistoryPanel } from "@/components/history-panel"
import { ImageWorkspace } from "@/components/image-workspace"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useLocalStorage } from "@/lib/use-local-storage"
import type { GenerationRecord } from "@/lib/types"
import { useState } from "react"

export default function Home() {
  const [history, setHistory] = useLocalStorage<GenerationRecord[]>("history", [])
  const { setTheme, theme } = useTheme()
  const [selectedRecord, setSelectedRecord] = useState<GenerationRecord | undefined>(undefined)

  const updateHistory = (newRecord: GenerationRecord) => {
    setHistory([newRecord, ...history])
  }

  const deleteRecords = (ids: string[]) => {
    setHistory(history.filter((record) => !ids.includes(record.id)))
  }

  const clearSelection = () => {
    setSelectedRecord(undefined)
  }

  return (
    <main className="min-h-screen flex select-none">
      {/* Desktop History Panel */}
      <div className="hidden md:block w-80 border-r bg-background overflow-y-auto">
        <HistoryPanel
          history={history}
          onDelete={deleteRecords}
          onSelect={setSelectedRecord}
          className="p-4"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
          {/* Top Bar */}
          <div className="flex justify-between items-center">
            {/* Mobile History Toggle */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <HistoryPanel history={history} onDelete={deleteRecords} onSelect={setSelectedRecord} className="p-4" />
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex pr-4 md:hidden absolute left-1/2 -translate-x-1/2">
              <div className="w-4 h-4 bg-yellow-200"></div>
              <div className="w-4 h-4 bg-cyan-400"></div>
              <div className="w-4 h-4 bg-green-500"></div>
              <div className="w-4 h-4 bg-red-400"></div>
              <div className="w-4 h-4 bg-blue-600"></div>
            </div>
            <h1 className="text-3xl font-semibold hidden md:block">DALL·E 2</h1>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="ml-auto"
            >
              <SunIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <MoonIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>

          {/* Main Workspace */}
          <ImageWorkspace
            updateHistory={updateHistory}
            selectedRecord={selectedRecord}
            onClearSelection={clearSelection}
          />
        </div>
      </div>
    </main>
  )
}

