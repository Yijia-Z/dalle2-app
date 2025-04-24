export interface GenerationRecord {
  id: string
  type: "generate" | "edit" | "variation"
  prompt?: string
  size: "256x256" | "512x512" | "1024x1024" | "1536x1024" | "1024x1536" | "auto"
  n: number
  cost: number
  createdAt: number
  originalImage?: string
  maskImage?: string
  base64Images: string[]
  requestTime: number
  model: "dall-e-2" | "gpt-image-1"
  usage?: {
    input_tokens?: number
    input_tokens_details?: {
      text_tokens?: number
      image_tokens?: number
    }
    output_tokens?: number
    total_tokens?: number
  }
}

export interface UserPreferences {
  apiKey: string
}

