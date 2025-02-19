export interface GenerationRecord {
  id: string
  type: "generate" | "edit" | "variation"
  prompt?: string
  size: "256x256" | "512x512" | "1024x1024"
  n: number
  cost: number
  createdAt: number
  originalImage?: string
  maskImage?: string
  base64Images: string[]
  requestTime: number
}

export interface UserPreferences {
  apiKey: string
}

