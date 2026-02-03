
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { getWorkingApiKey, reportKeyError, getModelConfig } from './apiKeyService';

// A custom error class for better error identification
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper to get an AI client with a working key
const getAIClient = (): { client: GoogleGenAI, key: string } => {
    const key = getWorkingApiKey();
    if (!key) {
        throw new Error("Không có API key nào khả dụng. Vui lòng thêm key trong phần Quản lý API.");
    }
    return { client: new GoogleGenAI({ apiKey: key }), key };
};

// Centralized error handler to provide more specific user-facing messages
const handleError = (error: any, context: string): never => {
  console.error(`Lỗi trong ${context}:`, error);

  let message = `Đã xảy ra lỗi không xác định khi ${context}. Vui lòng thử lại sau.`;

  if (error) {
    // Try to extract the error message from various possible structures
    let specificMessage = '';
    if (error instanceof Error) {
        specificMessage = error.message;
    } else if (typeof error === 'object') {
        specificMessage = error.message || error.error?.message || JSON.stringify(error);
    } else {
        specificMessage = String(error);
    }

    const errorMessageLower = specificMessage.toLowerCase();
    const errorCode = error.code || error.error?.code;
    const errorStatus = error.status || error.error?.status;
    
    if (errorMessageLower.includes('safety') || errorMessageLower.includes('blocked')) {
      specificMessage = 'Yêu cầu của bạn đã bị từ chối vì lý do an toàn (Safety Filters). Vui lòng thử hình ảnh khác hoặc mô tả khác.';
    } else if (
        errorMessageLower.includes('429') || 
        errorMessageLower.includes('rate limit') || 
        errorMessageLower.includes('quota') ||
        errorCode === 429 ||
        errorStatus === 'RESOURCE_EXHAUSTED'
    ) {
      // Append original message for debugging
      specificMessage = `Hệ thống đang bận hoặc API Key đã hết hạn mức (Quota). (Chi tiết: ${specificMessage})`;
    } else if (
        errorMessageLower.includes('api key not valid') || 
        errorMessageLower.includes('403') || 
        errorCode === 403
    ) {
      specificMessage = 'API Key không hợp lệ hoặc hết hạn.';
    } else if (specificMessage.startsWith('model returned a text response')) {
      const modelResponse = specificMessage.substring(specificMessage.indexOf(':') + 1).trim();
      specificMessage = `AI không thể thực hiện yêu cầu và đã phản hồi: "${modelResponse}"`;
    } else if (errorMessageLower.includes('no image was generated') || errorMessageLower.includes('no edited image was returned') || errorMessageLower.includes('no image data')) {
      specificMessage = 'AI không thể tạo hoặc chỉnh sửa ảnh từ yêu cầu này. Vui lòng thử một mô tả khác, có thể chi tiết hơn.';
    } else if (errorMessageLower.includes('failed to fetch')) {
        specificMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet và thử lại.'
    }
    message = specificMessage;
  }
  
  throw new ApiError(message);
};

// Retry wrapper for API calls with key rotation
async function withRetry<T>(operation: (client: GoogleGenAI) => Promise<T>, context: string, retries = 3): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < retries; i++) {
        try {
            const { client, key } = getAIClient();
            try {
                return await operation(client);
            } catch (err: any) {
                // Determine if it's a quota or auth error that warrants rotation
                const msg = (err.message || err.error?.message || '').toLowerCase();
                const code = err.code || err.error?.code;
                const status = err.status || err.error?.status;

                const isQuotaError = 
                    msg.includes('429') || 
                    msg.includes('quota') || 
                    msg.includes('resource_exhausted') ||
                    code === 429 || 
                    status === 429 ||
                    status === 'RESOURCE_EXHAUSTED';

                const isAuthError = 
                    msg.includes('403') || 
                    msg.includes('key') || 
                    msg.includes('permission') || 
                    code === 403 || 
                    status === 403;

                if (isQuotaError || isAuthError) {
                    console.warn(`Key ${key.substring(0, 8)}... failed (Code: ${code}, Status: ${status}). Rotating...`);
                    reportKeyError(key);
                    lastError = err;
                    
                    // Add delay before retrying (Exponential backoff: 1s, 2s, 4s...)
                    // This helps if it's a temporary rate limit
                    const delay = 1000 * Math.pow(2, i);
                    await new Promise(resolve => setTimeout(resolve, delay));

                    continue; // Try next loop iteration with a potentially new key
                }
                
                throw err; // Throw other errors immediately
            }
        } catch (err) {
            lastError = err;
            // If getAIClient throws (no keys), stop immediately
            if (err instanceof Error && err.message.includes('Không có API key')) {
                throw err;
            }
        }
    }
    return handleError(lastError, context);
}


export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3';
export type VideoStyle = 'Mặc định' | 'Điện ảnh' | 'Sống động' | 'Tối giản';
export type BilingualPrompt = {
    vi: string;
    en: string;
};
export type ImageInput = {
    base64: string;
    mimeType: string;
};
export type VideoScript = {
  title: string;
  summary: string;
  scenes: {
    scene_number: number;
    visuals: string;
    voiceover: string;
    imageUrl?: string | 'loading' | 'failed';
  }[];
};

/**
 * Generates images from a text prompt.
 */
export const generateImageFromText = async (prompt: string, aspectRatio: AspectRatio, numberOfImages: number = 1): Promise<string[]> => {
  const modelId = getModelConfig().imageGenModel;
  return withRetry(async (ai) => {
    const enhancedPrompt = `${prompt}, 8k resolution, photorealistic, highly detailed, sharp focus, professional photography quality. Do not include any text, logos, or watermarks.`;
    const response = await ai.models.generateImages({
      model: modelId,
      prompt: enhancedPrompt,
      config: {
        numberOfImages: numberOfImages,
        outputMimeType: 'image/png',
        aspectRatio: aspectRatio,
      },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error('No images were generated by the API.');
    }

    const imageUrls = response.generatedImages.map(img => {
        const base64ImageBytes = img?.image?.imageBytes;
        if (base64ImageBytes) {
            return `data:image/png;base64,${base64ImageBytes}`;
        }
        return null;
    });
    
    const validImageUrls = imageUrls.filter((url): url is string => !!url);
    
    if (validImageUrls.length !== numberOfImages) {
        throw new Error(`Expected ${numberOfImages} images, but only received ${validImageUrls.length}.`);
    }

    return validImageUrls;
  }, 'tạo ảnh từ văn bản');
};

/**
 * Edits an image based on a text prompt.
 */
export const editImageWithText = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    const modelId = getModelConfig().imageEditModel;
    return withRetry(async (ai) => {
        const enhancedPrompt = `${prompt}. The final image must be of high quality, photorealistic, with sharp details, and look professional. Do not add any text, logos, or watermarks unless explicitly requested in the prompt.`;
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: enhancedPrompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const candidate = response.candidates?.[0];
        if (!candidate) throw new Error("No response from model.");
        if (candidate.finishReason === 'SAFETY') throw new Error("Generation blocked by safety filters.");

        const imagePart = candidate.content?.parts?.find(part => part.inlineData);

        if (imagePart?.inlineData?.data) { 
            const newBase64ImageBytes: string = imagePart.inlineData.data;
            const newMimeType = imagePart.inlineData.mimeType;
            return `data:${newMimeType};base64,${newBase64ImageBytes}`;
        } else {
            const textPart = candidate.content?.parts?.find(part => part.text);
            if (textPart?.text) {
                 throw new Error(`Model returned a text response: ${textPart.text}`);
            }
            throw new Error('No valid edited image data was returned from the API.');
        }
    }, 'chỉnh sửa ảnh');
};

/**
 * Increases bust size of the model in the image.
 */
export const processBreastLift = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = `Photorealistic edit. Increase the bust size of the woman in the image to be fuller (+2 to +3 cup size), ensuring a natural, attractive, and seamless look. Maintain the exact facial identity, hair, skin texture, and background. Do not distort hands or other body parts. High quality, detailed.`;
    return editImageWithText(base64ImageData, mimeType, prompt);
};

/**
 * Removes the background from an image.
 */
export const removeBackground = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = "Remove the background of this image completely. The final image should have a transparent background. Isolate the main subject perfectly with clean edges.";
    return editImageWithText(base64ImageData, mimeType, prompt);
};

/**
 * Restores an old, damaged photograph.
 */
export const restoreOldPhoto = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = `CRITICAL TASK: Restore and colorize this old photograph.
1.  **Colorization**: This is the most important step. **Colorize the photo with natural, realistic colors.** The final image MUST be in full color, not black and white or sepia.
2.  **Damage Repair**: Fix all visible damage including scratches, tears, creases, stains, and fading.
3.  **Detail Enhancement**: Sharpen the details, improve the focus, and enhance the overall clarity to make it look like a modern, high-quality photograph.
4.  **No Cropping**: Do not crop or change the original composition of the image.`;
    return editImageWithText(base64ImageData, mimeType, prompt);
};

/**
 * Upscales an image to a higher resolution.
 */
export const upscaleImage = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = "Upscale this image to a higher resolution. Enhance the details, sharpen the focus, and improve the overall quality without adding artifacts. Make it look like a high-resolution photograph.";
    return editImageWithText(base64ImageData, mimeType, prompt);
};

/**
 * Generates multiple edited image variations.
 */
export const generateMultipleImageEdits = async (
    base64ImageData: string, 
    mimeType: string, 
    prompt: string,
    numberOfImages: number
): Promise<string[]> => {
    const modelId = getModelConfig().imageEditModel;
    return withRetry(async (ai) => {
        const enhancedPrompt = `${prompt}. The resulting image must be photorealistic, high-resolution, with professional studio lighting and sharp focus. The quality should be exceptional. Do not include any text, logos, or watermarks.`;
        
        const results: string[] = [];
        const errors: string[] = [];

        // Execute sequentially to avoid Rate Limits (429) on new/free tier keys
        for (let i = 0; i < numberOfImages; i++) {
            try {
                const response = await ai.models.generateContent({
                    model: modelId,
                    contents: {
                        parts: [
                            { inlineData: { data: base64ImageData, mimeType: mimeType } },
                            { text: enhancedPrompt },
                        ],
                    },
                    config: {
                        responseModalities: [Modality.IMAGE],
                    },
                });

                const candidate = response.candidates?.[0];
                if (!candidate) {
                    throw new Error(`Attempt ${i + 1}: No response candidates.`);
                }
                
                if (candidate.finishReason === 'SAFETY') {
                    throw new Error(`Attempt ${i + 1}: Blocked by safety filters.`);
                }

                const imagePart = candidate.content?.parts?.find(part => part.inlineData);
                if (imagePart?.inlineData?.data) {
                    const newBase64ImageBytes: string = imagePart.inlineData.data;
                    const newMimeType = imagePart.inlineData.mimeType;
                    results.push(`data:${newMimeType};base64,${newBase64ImageBytes}`);
                } else {
                    const textPart = candidate.content?.parts?.find(part => part.text);
                    if (textPart?.text) {
                         throw new Error(`Model returned text instead of image: ${textPart.text.substring(0, 50)}...`);
                    }
                    throw new Error(`No valid image data in response.`);
                }
            } catch (err: any) {
                // If quota error, rethrow to trigger withRetry logic
                if (err.message?.includes('429') || err.status === 429 || err.code === 429) {
                    throw err;
                }
                console.error(`Error generating image ${i+1}:`, err.message);
                errors.push(err.message);
            }
        }

        if (results.length === 0) {
            // Throw the first error or a generic one if all failed
            throw new Error(errors[0] || `Could not generate any images. Likely due to safety filters or model refusal.`);
        }

        return results;

    }, 'tạo nhiều ảnh profile');
};

/**
 * Generates a descriptive bilingual prompt for creating a video from an image.
 */
export const generatePromptFromImage = async (
    base64ImageData: string, 
    mimeType: string, 
    userWish?: string
): Promise<BilingualPrompt> => {
    const modelId = getModelConfig().textModel;
    return withRetry(async (ai) => {
        let textPrompt = `Dựa vào hình ảnh này, hãy tạo một prompt cực kỳ sáng tạo, chi tiết và đầy cảm hứng để tạo một video clip quảng cáo ngắn (khoảng 5-10 giây), hấp dẫn và sống động. Prompt chỉ tập trung mô tả phần hình ảnh (cảnh, hành động, chuyển động camera, không khí) và KHÔNG bao gồm bất kỳ lời thoại/lời bình nào. Prompt không được dài quá 1000 từ. Prompt phải phù hợp cho một AI tạo video cao cấp.`;
        
        if (userWish && userWish.trim()) {
            textPrompt += ` Người dùng có mong muốn sau: "${userWish.trim()}". Hãy kết hợp ý tưởng này vào prompt cuối cùng.`;
        }

        textPrompt += ' Cung cấp prompt bằng cả tiếng Việt và tiếng Anh. Trả về dưới dạng một đối tượng JSON có key "vi" và "en".';
        
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: textPrompt,
                    },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        vi: {
                            type: Type.STRING,
                            description: 'Prompt video bằng tiếng Việt.',
                        },
                        en: {
                            type: Type.STRING,
                            description: 'The video prompt in English.',
                        },
                    },
                    required: ['vi', 'en'],
                },
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    }, 'tạo prompt từ ảnh');
};

/**
 * Suggests a suitable background based on model and clothing images.
 */
export const suggestBackground = async (model: ImageInput | null, clothing: ImageInput | null): Promise<string> => {
    const modelId = getModelConfig().textModel;
    return withRetry(async (ai) => {
        const parts: any[] = [];
        const promptText = "Phân tích người mẫu và trang phục trong (các) hình ảnh được cung cấp. Đề xuất một bối cảnh chụp ảnh quảng cáo chuyên nghiệp, chân thực và phù hợp. Ví dụ: 'một bãi biển yên tĩnh lúc hoàng hôn', 'nội thất quán cà phê hiện đại và sang trọng', 'một bức tường nghệ thuật đường phố rực rỡ sắc màu'. Chỉ trả về MỘT dòng văn bản thuần túy mô tả bối cảnh đó bằng tiếng Việt.";
        
        if (model) {
             parts.push({ inlineData: { data: model.base64, mimeType: model.mimeType } });
        }
        if (clothing) {
             parts.push({ inlineData: { data: clothing.base64, mimeType: clothing.mimeType } });
        }
        
        if(parts.length === 0) {
            return "bối cảnh studio tối giản với ánh sáng chuyên nghiệp";
        }
        
        parts.push({text: promptText});

        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts },
        });

        return response.text.trim();

    }, 'gợi ý bối cảnh'); 
};

/**
 * Generates an ad creative by combining a model, clothing, and accessory image.
 */
export const generateAdCreative = async (
    model: ImageInput | null,
    clothing: ImageInput | null,
    accessory: ImageInput | null,
    userPrompt: string,
    aspectRatio: AspectRatio
): Promise<string[]> => {
    const modelId = getModelConfig().imageEditModel;
    return withRetry(async (ai) => {
        const parts: any[] = [];
        let promptText = "Create a photorealistic, high-resolution advertising image suitable for a fashion brand. ";

        if (model) {
            parts.push({ inlineData: { data: model.base64, mimeType: model.mimeType } });
            promptText += "Use the provided person as the model. ";
        }
        if (clothing) {
            parts.push({ inlineData: { data: clothing.base64, mimeType: clothing.mimeType } });
            promptText += "The model should be wearing the provided clothing. ";
        }
        if (accessory) {
            parts.push({ inlineData: { data: accessory.base64, mimeType: accessory.mimeType } });
            promptText += "The provided accessory/product should be prominently and attractively featured. ";
        }

        let backgroundPrompt = '';
        if (userPrompt.trim()) {
            backgroundPrompt = userPrompt.trim();
        } else {
            backgroundPrompt = "minimalist studio background"; 
        }

        promptText += `Place them in the following setting: '${backgroundPrompt}'. The final image must have professional studio lighting, sharp focus, and be of exceptional quality. Ensure the model's face is clear and well-lit. Do not include any text, logos, or watermarks. IMPORTANT: The final output image MUST strictly adhere to a ${aspectRatio} aspect ratio. Do not alter this aspect ratio.`;

        parts.push({ text: promptText });
        
        const results: string[] = [];
        const errors: string[] = [];

        // Generate 1 image
        try {
            const response = await ai.models.generateContent({
                model: modelId,
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const candidate = response.candidates?.[0];
            if (!candidate) throw new Error("No response.");
            if (candidate.finishReason === 'SAFETY') throw new Error("Safety block.");

            const imagePart = candidate.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData?.data) {
                const newBase64 = imagePart.inlineData.data;
                const newMimeType = imagePart.inlineData.mimeType;
                results.push(`data:${newMimeType};base64,${newBase64}`);
            } else {
                const textPart = candidate.content?.parts?.find(p => p.text);
                if (textPart?.text) {
                     throw new Error(`Model returned a text response: ${textPart.text}`);
                }
                throw new Error("No image data.");
            }
        } catch (err: any) {
            if (err.message?.includes('429') || err.status === 429 || err.code === 429) throw err;
            errors.push(err.message);
        }

        if (results.length === 0) {
             throw new Error(errors[0] || 'No images generated.');
        }
        
        return results;

    }, 'tạo ảnh quảng cáo');
};

/**
 * Generates professional product photoshoot images.
 */
export const generateProductPhotoshoot = async (
    productImage: ImageInput,
    scenePrompt: string,
    aspectRatio: AspectRatio,
    numberOfImages: number
): Promise<string[]> => {
    const modelId = getModelConfig().imageEditModel;
    return withRetry(async (ai) => {
        const parts: any[] = [
            { inlineData: { data: productImage.base64, mimeType: productImage.mimeType } }
        ];

        const fullPrompt = `
        Task: Create a professional product photoshoot image.
        1.  **Product Isolation**: Take the primary product from the provided image and perfectly remove its original background. Do not alter the product itself.
        2.  **Scene Integration**: Place the isolated product into a new, photorealistic scene described as: "${scenePrompt}".
        3.  **Realism**: The lighting, shadows, and reflections on the product must perfectly match the new scene, making it look completely natural.
        4.  **Quality**: The final image must be high-resolution, sharp, and of professional quality.

        **CRITICAL RULES (MUST BE FOLLOWED):**
        -   **NO TEXT OR LOGOS**: Absolutely no text, letters, numbers, watermarks, or logos are allowed in the final image. The image must be clean.
        -   **ASPECT RATIO**: The final output image's aspect ratio MUST be exactly ${aspectRatio}. This is a strict requirement. For example, if the ratio is 9:16, the image must be tall (vertical), not wide. Adhere strictly to this instruction.
        `;

        parts.push({ text: fullPrompt });

        const results: string[] = [];
        const errors: string[] = [];

        // Execute sequentially to avoid Rate Limits
        for (let i = 0; i < numberOfImages; i++) {
            try {
                const response = await ai.models.generateContent({
                    model: modelId,
                    contents: { parts },
                    config: {
                        responseModalities: [Modality.IMAGE],
                    },
                });

                const candidate = response.candidates?.[0];
                if (!candidate) throw new Error("No response.");
                if (candidate.finishReason === 'SAFETY') throw new Error("Safety block.");

                const imagePart = candidate.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData?.data) {
                    results.push(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
                } else {
                     const textPart = candidate.content?.parts?.find(p => p.text);
                    if (textPart?.text) {
                         throw new Error(`Model returned a text response: ${textPart.text}`);
                    }
                    throw new Error("No image data.");
                }
            } catch (err: any) {
                if (err.message?.includes('429') || err.status === 429 || err.code === 429) throw err;
                errors.push(err.message);
            }
        }

        if (results.length === 0) {
            throw new Error(errors[0] || 'No images generated.');
        }
        
        return results;

    }, 'tạo ảnh sản phẩm');
};

export const extractFashionProduct = async (
    modelImage: ImageInput,
    itemsToExtract: string[]
): Promise<string> => {
    const modelId = getModelConfig().imageEditModel;
    return withRetry(async (ai) => {
        const itemList = itemsToExtract.join(', ');
        const promptText = `
        From the provided image of a person, perform the following tasks:
        1.  Precisely identify and segment the following fashion item(s): ${itemList}.
        2.  Isolate only the clothing item(s), removing the model and any other background elements completely.
        3.  Return a single image containing ONLY the extracted item(s) on a transparent background.
        4.  If multiple items are extracted, place them side-by-side with a small amount of space between them.
        5.  The final output must be clean, high-quality, and ready for commercial use (e.g., for an e-commerce catalog). Do not include any shadows or parts of the model's body.
        `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [
                    { inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } },
                    { text: promptText },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

        if (imagePart?.inlineData?.data) {
            const newBase64 = imagePart.inlineData.data;
            const newMimeType = imagePart.inlineData.mimeType;
            return `data:${newMimeType};base64,${newBase64}`;
        } else {
            const textPart = response.candidates?.[0]?.content?.parts.find(p => p.text);
            if (textPart?.text) {
                throw new Error(`Model returned a text response: ${textPart.text}`);
            }
            throw new Error('No valid image data was returned from the extraction process.');
        }
    }, 'tách sản phẩm thời trang');
};

export const dressOnModel = async (
    clothingImage: ImageInput,
    modelImage: ImageInput,
    aspectRatio: AspectRatio,
    userPrompt: string
): Promise<string> => {
    const modelId = getModelConfig().imageEditModel;
    return withRetry(async (ai) => {
        const promptText = `
        Act as a professional fashion photographer and editor.
        
        **INPUTS**:
        - **IMAGE 1 (Clothing)**: The garment to be worn.
        - **IMAGE 2 (Model)**: The person who will wear the garment.

        **TASK**:
        Create a high-resolution, photorealistic composite image of the model (from Image 2) wearing the clothing (from Image 1).

        **REQUIREMENTS**:
        - **Integration**: The clothing must fit the model naturally, respecting their pose, body shape, and the lighting of the original scene.
        - **Realism**: High fidelity texture, folds, and lighting.
        - **Output**: A single, clean fashion image.
        
        ${userPrompt ? `**USER NOTE**: ${userPrompt}` : ""}
        
        **TECH SPECS**:
        - Aspect Ratio: ${aspectRatio}
        - No text, no logos, no artifacts.
        `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [
                    { inlineData: { data: clothingImage.base64, mimeType: clothingImage.mimeType } },
                    { inlineData: { data: modelImage.base64, mimeType: modelImage.mimeType } },
                    { text: promptText },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const candidate = response.candidates?.[0];
        
        if (!candidate) {
            throw new Error("No response candidate returned from AI.");
        }
        
        if (candidate.finishReason === 'SAFETY') {
             throw new Error("Safety Block: The AI refused to process these images. This often happens with 'virtual try-on' requests involving people. Please try different images or a less specific prompt.");
        }

        const imagePart = candidate.content?.parts?.find(p => p.inlineData);

        if (imagePart?.inlineData?.data) {
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        } else {
            const textPart = candidate.content?.parts?.find(p => p.text);
            if (textPart?.text) {
                // If it returns text instead of image, it's often a refusal.
                throw new Error(`Model returned a text response instead of an image: "${textPart.text}"`);
            }
            throw new Error('No valid image data was returned. The model may have generated empty content.');
        }
    }, 'mặc đồ lên mẫu');
};

export const displayFashionProduct = async (
    clothingImage: ImageInput,
    scenePrompt: string,
    aspectRatio: AspectRatio
): Promise<string> => {
    const modelId = getModelConfig().imageEditModel;
    return withRetry(async (ai) => {
        const promptText = `
        Task: Create a professional photoshoot image for a fashion product.
        1.  **Product Placement**: Take the isolated clothing item and place it naturally within the described scene: "${scenePrompt}". The item could be on a hanger, on a mannequin, or neatly folded, as appropriate for the scene.
        2.  **Scene Integration**: The lighting, shadows, and reflections on the product must perfectly match the new scene, making it look completely natural and photorealistic.
        3.  **Quality**: The final image must be high-resolution, sharp, and of professional e-commerce quality.
        4.  **Clean Output**: Do not include any text, watermarks, or logos.
        5.  **Aspect Ratio**: The final output image's aspect ratio MUST be exactly ${aspectRatio}. This is a strict requirement.
        `;
        
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [
                    { inlineData: { data: clothingImage.base64, mimeType: clothingImage.mimeType } },
                    { text: promptText },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

        if (imagePart?.inlineData?.data) {
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        } else {
            const textPart = response.candidates?.[0]?.content?.parts.find(p => p.text);
            if (textPart?.text) {
                throw new Error(`Model returned a text response: ${textPart.text}`);
            }
            throw new Error('No valid image data was returned from the display process.');
        }
    }, 'trưng bày sản phẩm');
};


// Fix: Add generateVideoScript function
export const generateVideoScript = async (
    images: (ImageInput | null)[], 
    productName: string, 
    productInfo: string, 
    industry: string, 
    brandTone: string, 
    targetAudience: string, 
    duration: string, 
    cta: string
): Promise<VideoScript> => {
    const modelId = getModelConfig().textModel;
    return withRetry(async (ai) => {
        const parts: any[] = [];
        images.filter(img => img).forEach(img => {
            parts.push({ inlineData: { data: img!.base64, mimeType: img!.mimeType } });
        });

        const sceneCount = parseInt(duration.split('-')[0], 10) || 3;

        const textPrompt = `
        You are an expert scriptwriter for short video ads. Create a compelling video script based on the following information. The output MUST be a valid JSON object.

        Product Information:
        - Product Name: ${productName}
        - Description: ${productInfo}
        - Industry: ${industry}
        - Target Audience: ${targetAudience}

        Ad requirements:
        - Brand Tone: ${brandTone}
        - Number of scenes: ${sceneCount}
        - Call to Action (CTA): ${cta}

        Instructions:
        1.  Analyze any provided images for context about the product's appearance and use cases.
        2.  Write a script with a clear title and a brief summary.
        3.  The script must contain exactly ${sceneCount} scenes.
        4.  For each scene, provide:
            - "scene_number": An integer starting from 1.
            - "visuals": A detailed, creative description of the visuals for an AI image generator. The description should be in Vietnamese.
            - "voiceover": The voiceover text for the scene, also in Vietnamese.
        5.  The final voiceover should naturally lead into the call to action: "${cta}".
        6.  The tone of the entire script must match "${brandTone}".
        7.  Return ONLY the JSON object, with no surrounding text or markdown.
        `;

        parts.push({ text: textPrompt });
        
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    scene_number: { type: Type.INTEGER },
                                    visuals: { type: Type.STRING },
                                    voiceover: { type: Type.STRING },
                                },
                                required: ['scene_number', 'visuals', 'voiceover'],
                            },
                        },
                    },
                    required: ['title', 'summary', 'scenes'],
                },
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    }, 'tạo kịch bản video');
};

// Fix: Add generateImageForScene function
export const generateImageForScene = async (
    visuals: string,
    brandTone: string,
    productName: string,
    productImage: ImageInput | null,
    aspectRatio: AspectRatio
): Promise<string> => {
    const modelId = getModelConfig().imageEditModel;
    return withRetry(async (ai) => {
        const parts: any[] = [];
        
        if (productImage) {
            parts.push({ inlineData: { data: productImage.base64, mimeType: productImage.mimeType } });
        }
        
        const promptText = `
        Based on the provided product image (if any) and the following description, create a single, photorealistic, high-resolution advertising image.

        Visual Description: "${visuals}"

        Context:
        - Product Name: ${productName}
        - Desired Tone: ${brandTone}

        Instructions:
        - The image must be of exceptional quality, with professional lighting and sharp focus.
        - If a product image is provided, ensure the product is recognizable in the final image.
        - Do not include any text, logos, or watermarks.
        - IMPORTANT: The final output image MUST strictly adhere to a ${aspectRatio} aspect ratio.
        `;
        
        parts.push({ text: promptText });
        
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

        if (imagePart?.inlineData?.data) {
            const newBase64 = imagePart.inlineData.data;
            const newMimeType = imagePart.inlineData.mimeType;
            return `data:${newMimeType};base64,${newBase64}`;
        } else {
            const textPart = response.candidates?.[0]?.content?.parts.find(p => p.text);
            if (textPart?.text) {
                 throw new Error(`Model returned a text response: ${textPart.text}`);
            }
            throw new Error('No valid image data was returned for the scene.');
        }
    }, 'tạo ảnh cho cảnh');
};

// Fix: Add generateAdCopyFromScript function
export const generateAdCopyFromScript = async (script: VideoScript): Promise<string> => {
    const modelId = getModelConfig().textModel;
    return withRetry(async (ai) => {
        const scriptSummary = script.scenes.map(s => `Cảnh ${s.scene_number}: ${s.voiceover}`).join('\n');
        const prompt = `
        You are an expert copywriter. Based on the following video script, write a short, engaging, and persuasive ad copy for social media (like Facebook or TikTok).

        Video Script Title: ${script.title}
        Video Summary: ${script.summary}
        Voiceovers:
        ${scriptSummary}

        Instructions:
        - The ad copy should be in Vietnamese.
        - Keep it concise and impactful.
        - Include relevant hashtags.
        - End with a strong call to action.
        - Return only the ad copy text, without any introductory phrases.
        `;
        
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
        });
        
        return response.text.trim();

    }, 'tạo nội dung quảng cáo');
};

export const startVideoGeneration = async (prompt: string, style: VideoStyle, aspectRatio: AspectRatio, image: ImageInput | null) => {
    return withRetry(async (ai) => {
        const enhancedPrompt = `${prompt}. Create the video in a ${aspectRatio} aspect ratio. Style: ${style}.`;
        const requestPayload: any = {
            model: 'veo-2.0-generate-001',
            prompt: enhancedPrompt,
            config: { 
                numberOfVideos: 1,
            }
        };

        if (image) {
            requestPayload.image = {
                imageBytes: image.base64,
                mimeType: image.mimeType,
            };
        }

        return await ai.models.generateVideos(requestPayload);
    }, 'bắt đầu tạo video');
};

export const pollVideoGeneration = async (operation: any) => {
    return withRetry(async (ai) => {
        return await ai.operations.getVideosOperation({ operation });
    }, 'kiểm tra tiến trình tạo video');
};

export const translateTextToEnglish = async (text: string): Promise<string> => {
    const modelId = getModelConfig().textModel;
    return withRetry(async (ai) => {
        const prompt = `Translate the following Vietnamese text to English. Return only the translated text, without any introductory phrases.\n\nVietnamese text: "${text}"`;
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
        });
        return response.text.trim();
    }, 'dịch văn bản');
};

export const generateSpeechFromText = async (text: string, voiceName: string): Promise<string> => {
    return withRetry(async (ai) => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
            return audioData;
        } else {
            throw new Error("Không nhận được dữ liệu âm thanh từ API.");
        }
    }, 'tạo giọng nói');
};
