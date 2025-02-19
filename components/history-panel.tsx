"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, Trash2, CheckSquare, Square, ArrowLeftRight, Eye, History, Edit, Images, Sparkles, CheckCheck } from "lucide-react"
import type { GenerationRecord } from "@/lib/types"
import Image from "next/image"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface HistoryPanelProps {
  history: GenerationRecord[]
  onDelete: (ids: string[]) => void
  onSelect: (record: GenerationRecord) => void
  className?: string
}

export function HistoryPanel({ history, onDelete, onSelect, className = "" }: HistoryPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const isAllSelected = history.length > 0 && selectedIds.length === history.length
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(history.map(record => record.id))
    }
  }

  const handleDownload = async () => {
    const selectedRecords = history.filter((record) => selectedIds.includes(record.id))
    for (const record of selectedRecords) {
      for (const [index, base64Image] of record.base64Images.entries()) {
        try {
          const response = await fetch(base64Image)
          const blob = await response.blob()
          const fileName = `dalle2-${record.type}-${record.id}-${index + 1}.png`

          const a = document.createElement("a")
          a.href = URL.createObjectURL(blob)
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } catch (error) {
          console.error("Error downloading image:", error)
        }
      }
    }
    setSelectedIds([])
  }

  const handleDelete = () => {
    onDelete(selectedIds)
    setSelectedIds([])
  }


  const handleSingleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete([id])
  }

  const getImageSource = (record: GenerationRecord, index: number) => {
    return record.base64Images[index] || "/placeholder.svg"
  }

  const openOriginalImage = (record: GenerationRecord, index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const imageSource = getImageSource(record, index)
    const win = window.open()
    if (win) {
      win.document.write(`<img src="${imageSource}" style="max-width: 100%; height: auto;">`)
    }
  }

  const handleSingleDownload = async (record: GenerationRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    for (const [index, base64Image] of record.base64Images.entries()) {
      try {
        const response = await fetch(base64Image)
        const blob = await response.blob()
        const fileName = `dalle2-${record.type}-${record.id}-${index + 1}.png`

        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch (error) {
        console.error("Error downloading image:", error)
      }
    }
  }

  const reverseSelection = () => {
    setSelectedIds(history
      .map(record => record.id)
      .filter(id => !selectedIds.includes(id)))
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  return (
    <div className={`${className} h-screen flex flex-col p-4 pr-0`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {selectedIds.length === 0 && (
            <><History /><h2 className="text-2xl font-bold py-1">History</h2></>
          )}
        </div>
        {selectedIds.length > 0 && (
          <div className="flex justify-between w-full pr-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="default"
                onClick={toggleSelectAll}
              >
                {isAllSelected ? (
                  <>
                    <CheckCheck className="h-4 w-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    Select All
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={reverseSelection}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="icon" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="icon" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 pr-4">
          {history.map((record) => (
            <Card
              key={record.id}
              className={`transition-colors group relative ${selectedIds.includes(record.id) ? "border-primary" : ""} 
                cursor-pointer hover:border-primary/50`}
              onClick={() => selectedIds.length > 0 ? toggleSelection(record.id) : onSelect(record)}
            >
              <div className={`absolute bottom-2 right-2 z-10 transition-opacity ${selectedIds.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-secondary/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(record.id);
                  }}
                >
                  {selectedIds.includes(record.id) ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {selectedIds.length === 0 && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => handleSingleDownload(record, e)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => handleSingleDelete(record.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {record.type === "generate" && <Sparkles className="h-4 w-4 text-primary" />}
                      {record.type === "variation" && <Images className="h-4 w-4 text-primary" />}
                      {record.type === "edit" && <Edit className="h-4 w-4 text-primary" />}
                      <p className="font-medium">{record.type.charAt(0).toUpperCase() + record.type.slice(1)}</p>
                    </div>
                    {record.prompt && <p className="text-sm text-muted-foreground truncate">{record.prompt}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Size: {record.size} | Cost: ${record.cost.toFixed(3)} | Images: {record.n}
                    </p>
                  </div>
                </div>

                {/* Preview Grid */}
                <div className={cn(
                  "w-full",
                  record.base64Images.length > 1 ? "grid grid-cols-2 gap-2" : "relative aspect-square"
                )}>
                  {record.base64Images.map((_, index) => (
                    <div key={index} className="relative aspect-square group/image">
                      <div className="relative w-full h-full">
                        <Image
                          src={getImageSource(record, index)}
                          alt={`Generated image ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-contain rounded-md"
                        />
                        {!selectedIds.includes(record.id) && (
                          <div
                            className="absolute inset-0 bg-background/80 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            onClick={(e) => openOriginalImage(record, index, e)}
                          >
                            <Eye className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

