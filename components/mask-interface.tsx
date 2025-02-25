"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface MaskInterfaceProps {
    image: string
    onMaskComplete: (mask: string) => void
    onCancel: () => void
}

export function MaskInterface({ image, onMaskComplete, onCancel }: MaskInterfaceProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
    const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null)
    const [maskCtx, setMaskCtx] = useState<CanvasRenderingContext2D | null>(null)
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
    const [brushSize, setBrushSize] = useState(20)

    const renderCanvas = useCallback(() => {
        if (!ctx || !canvasRef.current || !originalImage || !maskCanvas) return

        // Clear the display canvas
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

        // Draw checkerboard pattern first
        const pattern = createCheckerboardPattern(ctx)
        ctx.fillStyle = pattern
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)

        // Draw the original image masked by the mask
        ctx.globalCompositeOperation = "source-over"

        // Create a temporary canvas for the masked original image
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvasRef.current.width
        tempCanvas.height = canvasRef.current.height
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx) {
            // Draw the original image
            tempCtx.drawImage(originalImage, 0, 0)
            // Use the mask as alpha
            tempCtx.globalCompositeOperation = "destination-in"
            tempCtx.drawImage(maskCanvas, 0, 0)
            // Draw the result on main canvas
            ctx.drawImage(tempCanvas, 0, 0)
        }
    }, [ctx, originalImage, maskCanvas])

    useEffect(() => {
        // Load image first to get dimensions
        const img = new Image()
        img.src = image
        img.onload = () => {
            setOriginalImage(img)
            setCanvasSize({ width: img.width, height: img.height })
            // Calculate initial brush size proportional to image width (20:1024)
            setBrushSize(Math.round((img.width / 1024) * 20))

            const canvas = canvasRef.current
            if (!canvas) return

            // Set canvas size to match image
            canvas.width = img.width
            canvas.height = img.height

            const context = canvas.getContext("2d", { willReadFrequently: true })
            if (!context) return
            setCtx(context)

            // Create mask canvas with same dimensions
            const mCanvas = document.createElement("canvas")
            mCanvas.width = img.width
            mCanvas.height = img.height
            const mContext = mCanvas.getContext("2d", { willReadFrequently: true })
            if (!mContext) return

            // Initialize mask as solid white (fully opaque)
            mContext.fillStyle = "white"
            mContext.fillRect(0, 0, mCanvas.width, mCanvas.height)

            setMaskCanvas(mCanvas)
            setMaskCtx(mContext)
        }
    }, [image])

    // Add effect to render canvas when dependencies are ready
    useEffect(() => {
        if (ctx && originalImage && maskCanvas) {
            renderCanvas()
        }
    }, [ctx, originalImage, maskCanvas, renderCanvas])

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        setIsDrawing(true)
        draw(e)
    }

    const stopDrawing = () => {
        setIsDrawing(false)
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !ctx || !canvasRef.current || !originalImage || !maskCtx) return

        const rect = canvasRef.current.getBoundingClientRect()
        let x, y

        if ('touches' in e) {
            // Touch event
            const touch = e.touches[0]
            x = (touch.clientX - rect.left) * (canvasRef.current.width / rect.width)
            y = (touch.clientY - rect.top) * (canvasRef.current.height / rect.height)
        } else {
            // Mouse event
            x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width)
            y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height)
        }

        // Draw on the mask (make transparent where user draws)
        maskCtx.globalCompositeOperation = "destination-out"
        maskCtx.beginPath()
        maskCtx.arc(x, y, brushSize, 0, Math.PI * 2)
        maskCtx.fill()

        // Render the updated state
        renderCanvas()
    }

    const createCheckerboardPattern = (ctx: CanvasRenderingContext2D) => {
        const patternCanvas = document.createElement("canvas")
        const patternContext = patternCanvas.getContext("2d")
        if (!patternContext) return "#fff"

        patternCanvas.width = 20
        patternCanvas.height = 20

        // Draw checkerboard
        patternContext.fillStyle = "#e5e5e5"
        patternContext.fillRect(0, 0, 10, 10)
        patternContext.fillRect(10, 10, 10, 10)
        patternContext.fillStyle = "#ffffff"
        patternContext.fillRect(0, 10, 10, 10)
        patternContext.fillRect(10, 0, 10, 10)

        return ctx.createPattern(patternCanvas, "repeat") || "#fff"
    }

    const handleComplete = useCallback(() => {
        if (!maskCanvas) return
        onMaskComplete(maskCanvas.toDataURL("image/png"))
    }, [maskCanvas, onMaskComplete])

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <Label>Brush Size: {brushSize}px</Label>
                            <Slider
                                min={1}
                                // Adjust max brush size to be proportional to image width
                                max={Math.round((canvasSize.width / 1024) * 100)}
                                step={1}
                                value={[brushSize]}
                                onValueChange={([value]) => setBrushSize(value)}
                                className="my-2"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div>
                            <canvas
                                ref={canvasRef}
                                width={canvasSize.width}
                                height={canvasSize.height}
                                style={{
                                    width: "100%",
                                    height: "auto",
                                    aspectRatio: canvasSize.width ? `${canvasSize.width}/${canvasSize.height}` : "1",
                                    cursor: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${brushSize * (1024 / canvasSize.width)}' height='${brushSize * (1024 / canvasSize.width)}'><circle cx='${brushSize * (1024 / canvasSize.width) / 2}' cy='${brushSize * (1024 / canvasSize.width) / 2}' r='${brushSize * (1024 / canvasSize.width) / 2}' fill='rgba(0,0,0,0.3)' stroke='white' stroke-width='1'/></svg>") ${brushSize * (1024 / canvasSize.width) / 2} ${brushSize * (1024 / canvasSize.width) / 2}, auto`
                                }}
                                className="touch-none border rounded-lg"
                                onMouseDown={startDrawing}
                                onMouseUp={stopDrawing}
                                onMouseOut={stopDrawing}
                                onMouseMove={draw}
                                onTouchStart={startDrawing}
                                onTouchEnd={stopDrawing}
                                onTouchMove={draw}
                            />
                        </div>
                        <div className="bg-background/80 p-2 text-xs text-center rounded-lg">
                            Paint the areas you want to edit
                        </div>
                    </div>
                    <div className="flex justify-end gap-4">
                        <Button variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleComplete}>Apply Mask</Button>
                    </div>
                </div>
            </div>
        </div>
    )
} 