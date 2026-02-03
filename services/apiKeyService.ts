
import { GoogleGenAI } from "@google/genai";

export type ApiKeyConfig = {
  key: string;
  isValid: boolean;
  isActive: boolean;
  lastUsed?: number;
  errorCount: number;
};

export type ModelConfig = {
  textModel: string;
  imageGenModel: string;
  imageEditModel: string;
};

const KEYS_STORAGE_KEY = 'tlab-api-keys';
const MODEL_CONFIG_KEY = 'tlab-model-config';

// Default Models
export const DEFAULT_MODELS: ModelConfig = {
  textModel: 'gemini-2.5-flash',
  imageGenModel: 'imagen-3.0-generate-001',
  imageEditModel: 'gemini-2.5-flash-image'
};

export const AVAILABLE_MODELS = {
  text: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)' }
  ],
  imageGen: [
    { id: 'imagen-3.0-generate-001', name: 'Imagen 3' },
    { id: 'imagen-3.0-fast-generate-001', name: 'Imagen 3 Fast' }
  ],
  imageEdit: [
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image' },
    // Adding placeholder for Imagen 2 Edit if supported by API lib, keeping safe default for now
  ]
};

// Retrieve all keys
export const getKeys = (): ApiKeyConfig[] => {
  try {
    const keys = localStorage.getItem(KEYS_STORAGE_KEY);
    return keys ? JSON.parse(keys) : [];
  } catch (e) {
    return [];
  }
};

// Save keys
const saveKeys = (keys: ApiKeyConfig[]) => {
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
};

// Get Model Configuration
export const getModelConfig = (): ModelConfig => {
  try {
    const config = localStorage.getItem(MODEL_CONFIG_KEY);
    return config ? { ...DEFAULT_MODELS, ...JSON.parse(config) } : DEFAULT_MODELS;
  } catch (e) {
    return DEFAULT_MODELS;
  }
};

// Save Model Configuration
export const saveModelConfig = (config: ModelConfig) => {
  localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(config));
};

// Add a new key
export const addKey = async (key: string): Promise<boolean> => {
  const keys = getKeys();
  if (keys.some(k => k.key === key)) return false; // Duplicate check

  // Validate the key by making a lightweight API call
  const isValid = await validateApiKey(key);

  const newKeyConfig: ApiKeyConfig = {
    key,
    isValid,
    isActive: isValid,
    errorCount: 0,
    lastUsed: Date.now()
  };

  saveKeys([...keys, newKeyConfig]);
  return isValid;
};

// Remove a key
export const removeKey = (key: string) => {
  const keys = getKeys();
  saveKeys(keys.filter(k => k.key !== key));
};

// Toggle active status
export const toggleKeyActive = (key: string) => {
  const keys = getKeys();
  const updatedKeys = keys.map(k => 
    k.key === key ? { ...k, isActive: !k.isActive } : k
  );
  saveKeys(updatedKeys);
};

// Simple validation function
const validateApiKey = async (key: string): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    // Use a cheap model for validation
    await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'test',
    });
    return true;
  } catch (error) {
    console.error("API Key Validation Failed:", error);
    return false;
  }
};

// Get a working API key (Rotation Logic)
export const getWorkingApiKey = (): string | null => {
  const keys = getKeys();
  const activeKeys = keys.filter(k => k.isActive && k.isValid);

  if (activeKeys.length === 0) {
      // Fallback to process.env if no keys are managed by user
      return process.env.API_KEY || null;
  }

  // Sort by last used (Round Robinish) and error count
  // Prefer keys with fewer errors and used least recently
  activeKeys.sort((a, b) => {
      if (a.errorCount !== b.errorCount) return a.errorCount - b.errorCount;
      return (a.lastUsed || 0) - (b.lastUsed || 0);
  });

  const bestKey = activeKeys[0];
  
  // Update usage timestamp
  updateKeyUsage(bestKey.key);
  
  return bestKey.key;
};

// Update key stats
export const updateKeyUsage = (key: string) => {
    const keys = getKeys();
    const updatedKeys = keys.map(k => k.key === key ? { ...k, lastUsed: Date.now() } : k);
    saveKeys(updatedKeys);
};

export const reportKeyError = (key: string) => {
    const keys = getKeys();
    const updatedKeys = keys.map(k => 
        k.key === key ? { ...k, errorCount: k.errorCount + 1 } : k
    );
    saveKeys(updatedKeys);
};
