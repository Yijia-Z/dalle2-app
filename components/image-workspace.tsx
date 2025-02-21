"use client"

import type React from "react"
import Image from "next/image"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Eye, ImagePlus, Sparkles, Loader2, ImageMinus, Images, Edit, Paintbrush, X, Square, Grid2X2, Grid3X3 } from "lucide-react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { generateImage, createImageVariation, createImageEdit } from "@/lib/openai"
import type { GenerationRecord } from "@/lib/types"
import { CropInterface } from "./crop-interface"
import { MaskInterface } from "./mask-interface"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLocalStorage } from "@/lib/use-local-storage"
import { Skeleton } from "@/components/ui/skeleton"

interface ImageWorkspaceProps {
  updateHistory: (newRecord: GenerationRecord) => void
  selectedRecord?: GenerationRecord
  onClearSelection: () => void
}

export function ImageWorkspace({ updateHistory, selectedRecord, onClearSelection }: ImageWorkspaceProps) {
  const [apiKey, setApiKey] = useLocalStorage<string>("apiKey", "")
  const [prompt, setPrompt] = useState("")
  const [size, setSize] = useState<"256x256" | "512x512" | "1024x1024">("1024x1024")
  const [numImages, setNumImages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [mode, setMode] = useState<"generate" | "edit" | "variation">("generate")
  const [mask, setMask] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [originalImageFile, setOriginalImageFile] = useState<string | null>(null)
  const [showMaskInterface, setShowMaskInterface] = useState(false)

  useEffect(() => {
    if (selectedRecord) {
      setPrompt(selectedRecord.prompt || "")
      setSize(selectedRecord.size)
      setNumImages(selectedRecord.n)
      setMode(selectedRecord.type)

      if (selectedRecord.originalImage) {
        setUploadedImage(selectedRecord.originalImage)
      }

      if (selectedRecord.maskImage) {
        setMask(selectedRecord.maskImage)
      }

      setResults(selectedRecord.base64Images)
    }
  }, [selectedRecord])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setOriginalImageFile(dataUrl)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = (croppedImage: string) => {
    setUploadedImage(croppedImage)
    setShowCropper(false)
    setMode("variation")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey) return

    setIsLoading(true)
    try {
      let response

      if (mode === "generate") {
        response = await generateImage(apiKey, prompt, numImages, size)
      } else if (mode === "variation" && uploadedImage) {
        response = await createImageVariation(apiKey, uploadedImage, numImages, size)
      } else if (mode === "edit" && uploadedImage && mask) {
        response = await createImageEdit(apiKey, uploadedImage, mask, prompt, numImages, size)
      } else {
        throw new Error("Invalid mode or missing data")
      }

      const base64Images = response.data.map((item: { b64_json: string }) =>
        `data:image/png;base64,${item.b64_json}`
      )
      setResults(base64Images)

      const newRecord: GenerationRecord = {
        id: Date.now().toString(),
        type: mode,
        prompt: mode !== "variation" ? prompt : undefined,
        size,
        base64Images,
        requestTime: Date.now(),
        n: numImages,
        cost: calculateCost(size, numImages),
        createdAt: Date.now(),
        originalImage: uploadedImage || undefined,
        maskImage: mask || undefined,
      }
      updateHistory(newRecord)
    } catch (error) {
      console.error("Error:", error)
      // TODO: Add error handling UI
    } finally {
      setIsLoading(false)
    }
  }

  const calculateCost = (size: string, n: number) => {
    const costMap = {
      "256x256": 0.016,
      "512x512": 0.018,
      "1024x1024": 0.02,
    }
    return costMap[size as keyof typeof costMap] * n
  }

  const handleModeChange = (newMode: "variation" | "edit") => {
    setMode(newMode)
    if (newMode === "edit" && !mask) {
      setShowMaskInterface(true)
    }
  }

  const openOriginalImage = (base64Image: string) => {
    const win = window.open()
    if (win) {
      win.document.write(`<img src="${base64Image}" style="max-width: 100%; height: auto;">`)
    }
  }

  const handleDownload = async (base64Image: string, index: number) => {
    try {
      const response = await fetch(base64Image)
      const blob = await response.blob()
      const fileName = `dalle2-${mode}-${Date.now()}-${index + 1}.png`

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

  const getEstimatedCost = () => {
    return calculateCost(size, numImages).toFixed(3)
  }

  const handleSelectAsUpload = (base64Image: string) => {
    setUploadedImage(base64Image)
    setMode("variation")
    setResults([])
  }

  return (
    <ScrollArea className="h-[calc(87vh)] -mr-4">
      <div className="space-y-6 pr-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* API Key Input */}
          <div className="flex gap-4">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="OpenAI API Key"
              className="font-mono text-xs h-9"
            />
          </div>

          {/* Hidden file input - moved outside conditionals */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png"
            className="hidden"
            onChange={handleImageUpload}
          />

          {selectedRecord && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-lg">
                <Eye />
                {selectedRecord.type === "generate" && <Sparkles />}
                {selectedRecord.type === "variation" && <Images />}
                {selectedRecord.type === "edit" && <Edit />}
                Viewing saved {selectedRecord.type} request
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setPrompt("")
                  setSize("1024x1024")
                  setNumImages(1)
                  setMode("generate")
                  setUploadedImage(null)
                  setMask(null)
                  setResults([])
                  onClearSelection()
                }}
              >
                <X className="h-4 w-4" />
                <span className="hidden md:inline">Clear Selection</span>
              </Button>
            </div>
          )}
          {uploadedImage ? (
            <div className="flex gap-4">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === "variation" ? "No prompt needed for variations" : "Enter your prompt here"}
                maxLength={1000}
                className="flex-1"
                disabled={mode === "variation"}
                required={mode === "generate" || mode === "edit"}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                  <span className="hidden md:inline">Upload</span>
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-2"
                  onClick={() => {
                    setUploadedImage(null)
                    setMask(null)
                    setMode("generate")
                  }}
                >
                  <ImageMinus className="h-4 w-4" />
                  <span className="hidden md:inline">Clear</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here"
                maxLength={1000}
                className="flex-1"
                required
              />
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                <span className="hidden md:inline">Upload</span>
              </Button>
            </div>
          )}

          {uploadedImage && (
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="border rounded-lg p-4 bg-muted/50 flex-1 w-full">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium">
                    {mode === "variation" ? "Image to Vary" : "Mask Preview"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={mode === "variation" ? "default" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={() => handleModeChange("variation")}
                    >
                      <Images className="h-4 w-4" />
                      <span className="hidden md:inline">Variation</span>
                    </Button>
                    <Button
                      type="button"
                      variant={mode === "edit" ? "default" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={() => handleModeChange("edit")}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="hidden md:inline">Edit</span>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div
                    className={cn(
                      "relative border rounded-lg overflow-hidden bg-checkerboard aspect-square w-full group/preview",
                      mode === "edit" && "cursor-pointer hover:ring-2 hover:ring-primary"
                    )}
                    style={{ maxWidth: window?.innerWidth < 640 ? "100%" : "min(256px, 100%)" }}
                    onClick={() => mode === "edit" && setShowMaskInterface(true)}
                  >
                    <Image
                      src={uploadedImage}
                      alt="Original image"
                      fill
                      sizes="(min-width: 640px) 256px, 100vw"
                      className="object-contain"
                      style={mode === "edit" && mask ? {
                        mask: `url(${mask}) center/contain`,
                        WebkitMask: `url(${mask}) center/contain`,
                        maskMode: "alpha",
                      } : undefined}
                    />
                    {mode === "edit" && (
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                        <Paintbrush className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-sm text-muted-foreground">
                    {mode === "variation" ? (
                      <>
                        <div className="font-medium text-foreground mb-1">Variation Mode</div>
                        Generate variations of the uploaded image. No prompt needed.
                      </>
                    ) : (
                      <>
                        <div className="font-medium text-foreground mb-1">Edit Mode</div>
                        Click the image to edit the mask. Areas you paint will be edited based on the prompt.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="sm:hidden">
                <Select value={numImages.toString()} onValueChange={(value) => setNumImages(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Number of images" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Number of Images</SelectLabel>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden sm:block">
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[numImages]}
                  onValueChange={([value]) => setNumImages(value)}
                  className="my-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground px-2">
                  <div className="w-0.5 h-1.5 bg-muted-foreground"></div>
                  <div className="w-0.5 h-1.5 bg-muted-foreground"></div>
                  <div className="w-0.5 h-1.5 bg-muted-foreground"></div>
                  <div className="w-0.5 h-1.5 bg-muted-foreground"></div>
                  <div className="w-0.5 h-1.5 bg-muted-foreground"></div>
                  <div className="w-0.5 h-1.5 bg-muted-foreground"></div>
                  <div className="w-0.5 h-1.5 bg-muted-foreground"></div>
                  <div className="w-0.5 h-1.5 bg-muted-foreground"></div>
                  <div className="w-0.5 h-1.5 bg-muted-foreground"></div>
                  <div className="w-0.5 h-1.5 bg-muted-foreground"></div>
                </div>
                <div className="text-xs text-muted-foreground text-center">{numImages}</div>
              </div>
            </div>
            <div className="w-32">
              <Select value={size} onValueChange={(value: "256x256" | "512x512" | "1024x1024") => setSize(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Image Size</SelectLabel>
                    <SelectItem value="256x256">
                      <div className="flex items-center gap-2">
                        <Square className="h-4 w-4" />
                        <span>256px</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="512x512">
                      <div className="flex items-center gap-2">
                        <Grid2X2 className="h-4 w-4" />
                        <span>512px</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="1024x1024">
                      <div className="flex items-center gap-2">
                        <Grid3X3 className="h-4 w-4" />
                        <span>1024px</span>
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isLoading || !apiKey || (mode !== "generate" && !uploadedImage)}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden md:inline">Processing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden md:inline">
                    Generate
                    {getEstimatedCost() ? ` $${getEstimatedCost()}` : ''}
                  </span>
                </div>
              )}
            </Button>
          </div>
        </form>

        {showCropper && originalImageFile && (
          <CropInterface
            image={originalImageFile}
            onCropComplete={handleCropComplete}
            onCancel={() => {
              setShowCropper(false)
              setOriginalImageFile(null)
            }}
          />
        )}

        {showMaskInterface && uploadedImage && (
          <MaskInterface
            image={uploadedImage}
            onMaskComplete={(maskImage) => {
              setMask(maskImage)
              setShowMaskInterface(false)
            }}
            onCancel={() => {
              setShowMaskInterface(false)
              if (!mask) {
                setMode("variation")
              }
            }}
          />
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: numImages }).map((_, index) => (
              <div key={index} className="relative aspect-square">
                <Skeleton className="w-full h-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((base64Image, index) => (
              <div key={index} className="relative aspect-square group">
                <div className="relative w-full h-full">
                  <Image
                    src={base64Image || "/placeholder.svg"}
                    alt={`Generated image ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-contain rounded-lg"
                  />
                </div>
                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openOriginalImage(base64Image)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(base64Image, index)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSelectAsUpload(base64Image)}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

