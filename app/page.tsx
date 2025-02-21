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
import { saveImage, getImage, deleteImage } from "@/lib/indexeddb"

export default function Home() {
  const [history, setHistory] = useLocalStorage<GenerationRecord[]>("history", [])
  const { setTheme, theme } = useTheme()
  const [selectedRecord, setSelectedRecord] = useState<GenerationRecord | undefined>(undefined)
  const MAX_HISTORY_LENGTH = 100; // Set a limit for the number of records

  const updateHistory = async (newRecord: GenerationRecord) => {
    // Save images to IndexedDB and create a modified record for localStorage
    const storageRecord = { ...newRecord };

    try {
      // Save each image to IndexedDB
      for (let i = 0; i < newRecord.base64Images.length; i++) {
        const base64Image = newRecord.base64Images[i];
        const response = await fetch(base64Image);
        const blob = await response.blob();
        // Save with a unique key for each image in the record
        const imageKey = `${newRecord.id}_${i}`;
        await saveImage(imageKey, blob);
      }

      // Remove base64 data before storing in localStorage
      storageRecord.base64Images = newRecord.base64Images.map((_, index) =>
        `${newRecord.id}_${index}`
      );

      // Update metadata in local storage 
      setHistory((prev) => {
        const updated = [storageRecord, ...prev];
        if (updated.length > MAX_HISTORY_LENGTH) {
          const oldest = updated.pop();
          if (oldest) {
            // Delete all images associated with the oldest record
            (async () => {
              try {
                // Delete each image for the record
                for (const imageKey of oldest.base64Images) {
                  await deleteImage(imageKey);
                }
              } catch (error) {
                console.error(`Failed to delete oldest record images:`, error);
              }
            })();
          }
        }
        return updated;
      });
    } catch (error) {
      console.error('Failed to save images:', error);
      throw error; // Re-throw to handle in the UI
    }
  }

  const deleteRecords = async (ids: string[]) => {
    // Delete images from IndexedDB first
    for (const id of ids) {
      const record = history.find(r => r.id === id)
      if (record) {
        // Delete all images associated with this record
        try {
          for (const imageKey of record.base64Images) {
            await deleteImage(imageKey);
          }
        } catch (error) {
          console.error(`Failed to delete images for record ${id}:`, error)
        }
      }
    }

    // Then update the history in localStorage
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
            <div className="md:hidden pr-4">
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

            <div className="flex pr-4">
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

