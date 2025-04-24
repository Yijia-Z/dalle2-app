"use client"

import type React from "react"
import Image from "next/image"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Eye, ImagePlus, Sparkles, Loader2, ImageMinus, Images, Edit, Paintbrush, X, Square, Grid2X2, Grid3X3, RectangleHorizontal, RectangleVertical, Maximize2 } from "lucide-react"
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
import { getImageAsDataUrl, saveImage } from "@/lib/indexeddb"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface ImageWorkspaceProps {
  updateHistory: (newRecord: GenerationRecord) => void
  selectedRecord?: GenerationRecord
  onClearSelection: () => void
  model: "dall-e-2" | "gpt-image-1"
}

export function ImageWorkspace({ updateHistory, selectedRecord, onClearSelection, model }: ImageWorkspaceProps) {
  const { toast } = useToast()
  const [apiKey, setApiKey] = useLocalStorage<string>("apiKey", "")
  const [prompt, setPrompt] = useState("")
  const [isPromptPopupOpen, setIsPromptPopupOpen] = useState(false)
  const [popupPromptText, setPopupPromptText] = useState("")
  const [size, setSize] = useState<"256x256" | "512x512" | "1024x1024" | "1536x1024" | "1024x1536" | "auto">(
    model === "dall-e-2" ? "1024x1024" : "auto"
  )
  const [numImages, setNumImages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [mode, setMode] = useState<"generate" | "edit" | "variation">("generate")
  const [mask, setMask] = useState<string | null>(null)
  const [background, setBackground] = useState<"transparent" | "opaque" | "auto">("auto")
  const [moderation, setModeration] = useState<"low" | "auto">("low")
  const [outputCompression, setOutputCompression] = useState(100)
  const [outputFormat, setOutputFormat] = useState<"png" | "jpeg" | "webp">("png")
  const [quality, setQuality] = useState<"auto" | "high" | "medium" | "low">("high")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [originalImageFile, setOriginalImageFile] = useState<string | null>(null)
  const [showMaskInterface, setShowMaskInterface] = useState(false)
  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  useEffect(() => {
    if (selectedRecord) {
      setPrompt(selectedRecord.prompt || "")
      setSize(selectedRecord.size)
      setNumImages(selectedRecord.n)
      setMode(selectedRecord.type)

      // Load images from IndexedDB
      const loadImages = async () => {
        try {
          if (selectedRecord.originalImage) {
            const originalDataUrl = await getImageAsDataUrl(selectedRecord.originalImage)
            setUploadedImage(originalDataUrl || null)
          }

          if (selectedRecord.maskImage) {
            const maskDataUrl = await getImageAsDataUrl(selectedRecord.maskImage)
            setMask(maskDataUrl || null)
          }

          // Load result images
          const loadedImages = await Promise.all(
            selectedRecord.base64Images.map(key => getImageAsDataUrl(key))
          )
          setResults(loadedImages.filter((img): img is string => img !== undefined))
        } catch (error) {
          console.error("Failed to load images:", error)
        }
      }

      loadImages()
    }
  }, [selectedRecord])

  // Update size when model changes
  useEffect(() => {
    setSize(model === "dall-e-2" ? "1024x1024" : "auto")
  }, [model])

  // Clear non-reusable fields when model changes
  useEffect(() => {
    setUploadedImage(null)
    setMask(null)
    setResults([])
    setMode("generate")
    setOriginalImageFile(null)
    setShowCropper(false)
    setShowMaskInterface(false)
    onClearSelection()
  }, [model, onClearSelection])

  // Calculate aspect ratio when uploaded image changes
  useEffect(() => {
    if (uploadedImage) {
      const img = new window.Image();
      img.onload = () => {
        setImageAspectRatio(img.naturalWidth / img.naturalHeight);
      };
      img.onerror = () => {
        console.error("Failed to load image for aspect ratio calculation");
        setImageAspectRatio(1); // Fallback to square on error
      };
      img.src = uploadedImage;
    } else {
      setImageAspectRatio(1); // Reset to square if no image
    }
  }, [uploadedImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (model === "gpt-image-1") {
        setUploadedImage(dataUrl)
        setMode("edit")
        setShowMaskInterface(true)
      } else {
        setOriginalImageFile(dataUrl)
        setShowCropper(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = (croppedImage: string) => {
    setUploadedImage(croppedImage)
    setShowCropper(false)
    if (model === "dall-e-2") {
      setMode("variation")
    }
  }

  const handlePromptChange = (value: string) => {
    setPrompt(value);
  };

  const handlePopupPromptChange = (value: string) => {
    setPopupPromptText(value);
  };

  const savePopupPrompt = () => {
    setPrompt(popupPromptText);
    setIsPromptPopupOpen(false);
  };

  const openPromptPopup = () => {
    setPopupPromptText(prompt);
    setIsPromptPopupOpen(true);
  };

  const isPromptOverLimit = (text: string) => {
    const maxLength = model === "gpt-image-1" ? 32000 : 1000;
    return text.length > maxLength;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) return;

    if (mode !== "variation" && isPromptOverLimit(prompt)) {
      toast({
        title: "Prompt Too Long",
        description: `Prompt exceeds the maximum length of ${model === "gpt-image-1" ? "32,000" : "1,000"} characters. Please shorten your prompt.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let response

      if (mode === "generate") {
        response = await generateImage(apiKey, prompt, numImages, size, model, {
          background,
          moderation,
          outputCompression,
          outputFormat,
          quality
        })
      } else if (mode === "variation" && uploadedImage) {
        response = await createImageVariation(apiKey, uploadedImage, numImages, size, model)
      } else if (mode === "edit" && uploadedImage && mask) {
        response = await createImageEdit(apiKey, uploadedImage, mask, prompt, numImages, size, model)
      } else {
        throw new Error("Invalid mode or missing data")
      }

      const base64Images = response.data.map((item: { b64_json: string }) =>
        `data:image/png;base64,${item.b64_json}`
      )
      setResults(base64Images)

      // Display token usage toast for gpt-image-1
      let totalCost = calculateCost(size, numImages, model, quality); // Calculate output cost first
      let inputTokenCost = 0; // Initialize input cost

      if (model === "gpt-image-1" && response.usage) {
        const inputTokens = response.usage.input_tokens || 0; // Ensure input_tokens exists
        inputTokenCost = (inputTokens / 1_000_000) * 10.00;
        totalCost += inputTokenCost; // Add input cost to total cost

        const outputCost = totalCost - inputTokenCost; // Recalculate output cost for the toast

        toast({
          title: "GPT-Image-1 Usage",
          description: `Input Cost: $${inputTokenCost.toFixed(3)}, Output Cost: $${outputCost.toFixed(3)}, Total Cost: $${totalCost.toFixed(3)} (Input: ${inputTokens}, Output: ${response.usage.output_tokens}, Total: ${response.usage.total_tokens} tokens)`,
        })
      } else if (model === "dall-e-2") {
        // Optional: Toast for DALL-E 2 cost
        toast({
          title: "DALL·E 2 Usage",
          description: `Total Cost: $${totalCost.toFixed(3)}`,
        })
      }

      const newRecord: GenerationRecord = {
        id: Date.now().toString(),
        type: mode,
        prompt: mode !== "variation" ? prompt : undefined,
        size,
        base64Images, // Will be replaced by keys before saving to local storage
        requestTime: response.created * 1000, // Use API timestamp
        n: numImages,
        cost: totalCost, // Store the final total cost (output + input)
        createdAt: Date.now(), // Keep local timestamp for sorting
        originalImage: undefined, // Placeholder, will be added later if needed
        maskImage: undefined, // Placeholder
        model,
        // Store usage details if available, especially for gpt-image-1
        usage: response.usage ? {
          input_tokens: response.usage.input_tokens,
          input_tokens_details: response.usage.input_tokens_details,
          output_tokens: response.usage.output_tokens,
          total_tokens: response.usage.total_tokens,
        } : undefined,
      }

      // Add original/mask image keys before saving to history
      try {
        if (mode !== 'generate' && uploadedImage) {
          const originalKey = `${newRecord.id}_original`;
          await saveImageFromDataUrl(originalKey, uploadedImage);
          newRecord.originalImage = originalKey;
        }
        if (mode === 'edit' && mask) {
          const maskKey = `${newRecord.id}_mask`;
          await saveImageFromDataUrl(maskKey, mask);
          newRecord.maskImage = maskKey;
        }
        // Now pass the complete record (with image keys) to updateHistory
        await updateHistory(newRecord);
      } catch (saveError) {
        console.error("Error saving images to IndexedDB:", saveError);
        toast({
          title: "Error Saving Images",
          description: "Could not save generated images locally. Check console for details.",
          variant: "destructive",
        });
        // Decide if you still want to update history without images, maybe with a flag
        // For now, we proceed to update history metadata but images might be missing
        // await updateHistory({ ...newRecord, base64Images: [] }); // Example: update without images
      }

    } catch (error) {
      console.error("Error during generation:", error)
      toast({
        title: "Generation Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to save data URL to IndexedDB
  const saveImageFromDataUrl = async (key: string, dataUrl: string) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await saveImage(key, blob);
  };

  const calculateCost = (size: string, n: number, model: string, quality: string = "auto") => {
    if (model === "gpt-image-1") {
      const gptImage1Costs = {
        low: {
          "1024x1024": 0.011,
          "1024x1536": 0.016,
          "1536x1024": 0.016,
          auto: 0.011, // Default to lowest cost if size is auto
        },
        medium: {
          "1024x1024": 0.042,
          "1024x1536": 0.063,
          "1536x1024": 0.063,
          auto: 0.042, // Default to medium 1024x1024 if size is auto
        },
        high: {
          "1024x1024": 0.167,
          "1024x1536": 0.250,
          "1536x1024": 0.250,
          auto: 0.167, // Default to high 1024x1024 if size is auto
        },
        auto: {
          // Default to medium quality if quality is auto
          "1024x1024": 0.042,
          "1024x1536": 0.063,
          "1536x1024": 0.063,
          auto: 0.042, // Default to medium 1024x1024
        }
      };

      const effectiveQuality = (quality === "auto" ? "medium" : quality) as keyof typeof gptImage1Costs;
      const effectiveSize = size as keyof typeof gptImage1Costs[typeof effectiveQuality];

      const costPerImage = gptImage1Costs[effectiveQuality]?.[effectiveSize] ?? gptImage1Costs.auto.auto; // Fallback to absolute default

      return costPerImage * n;

    } else if (model === "dall-e-2") {
      const costMap = {
        "256x256": 0.016,
        "512x512": 0.018,
        "1024x1024": 0.02,
        auto: 0.02 // Default for DALL-E 2 if size is 'auto'
      }
      return (costMap[size as keyof typeof costMap] ?? costMap.auto) * n
    } else {
      return 0; // Unknown model
    }
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
    return calculateCost(size, numImages, model, quality).toFixed(3)
  }

  const handleSelectAsUpload = (base64Image: string) => {
    setUploadedImage(base64Image)
    setResults([]) // Clear previous results

    if (model === "gpt-image-1") {
      setMode("edit") // Set mode to edit for gpt-image-1
      setShowMaskInterface(true) // Show mask interface
    } else {
      setMode("variation") // Keep variation mode for dall-e-2
    }
  }

  return (
    <ScrollArea className="h-[calc(100vh-72px)]">
      <div className="space-y-6 p-4">
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
            key={model}
            ref={fileInputRef}
            type="file"
            accept="image/png"
            className="hidden"
            onChange={handleImageUpload}
          />

          {selectedRecord && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm sm:text-lg">
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
                  setShowMaskInterface(false)
                  setShowCropper(false)
                  setOriginalImageFile(null)
                }}
              >
                <X className="h-4 w-4" />
                <span className="hidden md:inline">Clear Selection</span>
              </Button>
            </div>
          )}
          {uploadedImage ? (
            <div className="flex gap-4 items-start"> {/* Changed to items-start */}
              <div className="relative flex-1"> {/* Added relative container */}
                <Input
                  value={prompt}
                  onChange={(e) => handlePromptChange(e.target.value)} // Use handler
                  placeholder={mode === "variation" ? "No prompt needed for variations" : "Enter your prompt here"}
                  maxLength={model === "gpt-image-1" ? 32000 : 1000} // Dynamic max length
                  className="flex-1 pr-10" // Adjust padding for the button and character limit
                  disabled={mode === "variation"}
                  required={mode === "generate" || mode === "edit"}
                />
                <div className={`bg-background absolute right-10 top-1/2 -translate-y-1/2 text-xs font-mono ${prompt.length > (model === "gpt-image-1" ? 32000 : 1000) ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {prompt.length} / {model === "gpt-image-1" ? 32000 : 1000}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground"
                  onClick={openPromptPopup}
                  disabled={mode === "variation"}
                  aria-label="Edit prompt in popup"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
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
                    setShowMaskInterface(false)
                  }}
                >
                  <ImageMinus className="h-4 w-4" />
                  <span className="hidden md:inline">Clear</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="relative flex-1"> {/* Added relative container */}
                <Input
                  value={prompt}
                  onChange={(e) => handlePromptChange(e.target.value)} // Use handler
                  placeholder="Enter your prompt here"
                  maxLength={model === "gpt-image-1" ? 32000 : 1000} // Dynamic max length
                  className="flex-1 pr-10" // Adjust padding for the button and character limit
                  required
                />
                <div className={`bg-background absolute right-10 top-1/2 -translate-y-1/2 text-xs font-mono ${prompt.length > (model === "gpt-image-1" ? 32000 : 1000) ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {prompt.length} / {model === "gpt-image-1" ? 32000 : 1000}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground"
                  onClick={openPromptPopup}
                  aria-label="Edit prompt in popup"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
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
                  {model === "dall-e-2" && (
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
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div
                    className={cn(
                      "relative border rounded-lg overflow-hidden bg-checkerboard w-full group/preview",
                      mode === "edit" && "cursor-pointer hover:ring-2 hover:ring-primary"
                    )}
                    style={{
                      aspectRatio: imageAspectRatio,
                      maxWidth: window?.innerWidth < 640 ? "100%" : "min(256px, 100%)"
                    }}
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
                        {model === 'gpt-image-1' ?
                          "Click the image to edit the mask. Areas you paint will be edited based on the prompt." :
                          "Click the image to edit the mask (if supported) or generate variations. Areas you paint will be edited based on the prompt."
                        }
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
              <Select value={size} onValueChange={(value: "256x256" | "512x512" | "1024x1024" | "1536x1024" | "1024x1536" | "auto") => setSize(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Image Size</SelectLabel>
                    {model === "dall-e-2" ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <SelectItem value="1024x1024">
                          <div className="flex items-center gap-2">
                            <Grid3X3 className="h-4 w-4" />
                            <span>Square</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="1536x1024">
                          <div className="flex items-center gap-2">
                            <RectangleHorizontal className="h-4 w-4" />
                            <span>Landscape</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="1024x1536">
                          <div className="flex items-center gap-2">
                            <RectangleVertical className="h-4 w-4" />
                            <span>Portrait</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="auto">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            <span>Auto</span>
                          </div>
                        </SelectItem>
                      </>
                    )}
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
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden md:inline">
                    Generate
                    {getEstimatedCost() && parseFloat(getEstimatedCost()) > 0 && (
                      <Badge variant="secondary" className="ml-1.5 font-mono text-xs tabular-nums px-1.5 py-0.5">
                        ${getEstimatedCost()}
                      </Badge>
                    )}
                  </span>
                </div>
              )}
            </Button>
          </div>

          {/* Model-specific options */}
          {model === "gpt-image-1" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Background</label>
                <Select value={background} onValueChange={(value: "transparent" | "opaque" | "auto") => setBackground(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select background" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="transparent">Transparent</SelectItem>
                    <SelectItem value="opaque">Opaque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Moderation</label>
                <Select value={moderation} onValueChange={(value: "low" | "auto") => setModeration(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select moderation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Output Format</label>
                <Select value={outputFormat} onValueChange={(value: "png" | "jpeg" | "webp") => setOutputFormat(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quality</label>
                <Select value={quality} onValueChange={(value: "auto" | "high" | "medium" | "low") => setQuality(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {outputFormat !== 'png' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Output Compression ({outputCompression}%)</label>
                  <Slider
                    value={[outputCompression]}
                    onValueChange={([value]) => setOutputCompression(value)}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              )}
            </div>
          )}
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
                if (model === "dall-e-2") {
                  setMode("variation")
                }
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
                  {base64Image ? (
                    <Image
                      src={base64Image}
                      alt={`Generated image ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
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

        <Dialog open={isPromptPopupOpen} onOpenChange={setIsPromptPopupOpen}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Edit Prompt</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={popupPromptText}
                onChange={(e) => handlePopupPromptChange(e.target.value)}
                placeholder="Enter your prompt here"
                className={cn(
                  "min-h-[200px] max-h-[60vh] resize-y",
                  isPromptOverLimit(popupPromptText) && "text-destructive"
                )}
              />
              <div className="text-xs text-right mt-1">
                <span className={cn(
                  isPromptOverLimit(popupPromptText) ? "text-destructive" : "text-muted-foreground"
                )}>
                  {popupPromptText.length} / {model === "gpt-image-1" ? "32,000" : "1,000"} characters
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPromptPopupOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={savePopupPrompt}>
                Save Prompt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </ScrollArea>
  )
}

