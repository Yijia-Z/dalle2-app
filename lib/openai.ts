function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(",")
  const mime = arr[0].match(/:(.*?);/)?.[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

export async function generateImage(apiKey: string, prompt: string, n: number, size: string) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      n,
      size,
      model: "dall-e-2",
      response_format: "b64_json"
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to generate image")
  }

  return response.json()
}

export async function createImageVariation(apiKey: string, imageDataUrl: string, n: number, size: string) {
  const blob = dataURLtoBlob(imageDataUrl)

  const formData = new FormData()
  formData.append("image", blob, "image.png")
  formData.append("n", n.toString())
  formData.append("size", size)
  formData.append("model", "dall-e-2")
  formData.append("response_format", "b64_json")

  const response = await fetch("https://api.openai.com/v1/images/variations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to create image variation")
  }

  return response.json()
}

export async function createImageEdit(
  apiKey: string,
  imageDataUrl: string,
  maskDataUrl: string,
  prompt: string,
  n: number,
  size: string,
) {
  const imageBlob = dataURLtoBlob(imageDataUrl)
  const maskBlob = dataURLtoBlob(maskDataUrl)

  const formData = new FormData()
  formData.append("image", imageBlob, "image.png")
  formData.append("mask", maskBlob, "mask.png")
  formData.append("prompt", prompt)
  formData.append("n", n.toString())
  formData.append("size", size)
  formData.append("model", "dall-e-2")
  formData.append("response_format", "b64_json")

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Failed to create image edit")
  }

  return response.json()
}

