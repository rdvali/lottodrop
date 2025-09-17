/**
 * Avatar Utilities for LottoDrop Gaming Platform
 * 
 * Provides optimized DiceBear Bottts avatar generation with casino theming,
 * size-responsive configurations, and gaming-specific variants.
 */

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type AvatarVariant = 'default' | 'winning' | 'vip' | 'competitive'

interface AvatarConfig {
  colors: string
  backgroundColor?: string
  eyes: string
  mouth: string
  textureChance?: number
  antennas?: string
}

/**
 * Size to pixel mapping for optimal rendering
 */
export const AVATAR_SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64
}

/**
 * Size-specific configurations optimized for clarity at different scales
 */
export const SIZE_CONFIGS: Record<AvatarSize, Partial<AvatarConfig>> = {
  xs: { 
    textureChance: 0, 
    eyes: 'round,happy', 
    mouth: 'smile01' 
  },
  sm: { 
    textureChance: 10, 
    eyes: 'round,happy,glow', 
    mouth: 'smile01,smile02' 
  },
  md: { 
    textureChance: 15, 
    eyes: 'eva,happy,round,glow', 
    mouth: 'smile01,smile02,grill01' 
  },
  lg: { 
    textureChance: 20, 
    eyes: 'eva,glow,happy,robocop,round', 
    mouth: 'bite,grill01,grill02,smile01,smile02' 
  },
  xl: { 
    textureChance: 25, 
    eyes: 'eva,glow,happy,robocop,round,roundFrame01,sensor', 
    mouth: 'bite,diagram,grill01,grill02,smile01,smile02' 
  }
}

/**
 * Gaming variant configurations for different user states/achievements
 */
export const VARIANT_CONFIGS: Record<AvatarVariant, Partial<AvatarConfig>> = {
  default: {
    colors: '6A4C93,9D4EDD,A855F7',
    backgroundColor: '1a0f2e,2d1b69',
  },
  winning: {
    colors: '9D4EDD,FFD700,A855F7',
    backgroundColor: 'FFD700,FFA500',
    eyes: 'glow,happy',
    mouth: 'smile02',
    antennas: 'bulb'
  },
  vip: {
    colors: 'FFD700,FFA500,9D4EDD',
    backgroundColor: '2d1b69,9D4EDD',
    eyes: 'glow,roundFrame01',
    mouth: 'smile02,grill02',
    textureChance: 40
  },
  competitive: {
    colors: '6A4C93,FF6B6B,4ECDC4',
    backgroundColor: '1a0f2e,4ECDC4',
    eyes: 'robocop,sensor',
    mouth: 'grill01,grill02',
    antennas: 'wifi'
  }
}

/**
 * Generates a DiceBear Bottts avatar URL with LottoDrop branding
 * 
 * @param userId - Unique identifier for consistent avatar generation
 * @param size - Avatar size (xs, sm, md, lg, xl)
 * @param variant - Gaming variant for different user states
 * @returns Optimized Bottts avatar URL
 */
export function generateBotttsAvatar(
  userId: string, 
  size: AvatarSize = 'md', 
  variant: AvatarVariant = 'default'
): string {
  const pixelSize = AVATAR_SIZE_MAP[size]
  const sizeConfig = SIZE_CONFIGS[size]
  const variantConfig = VARIANT_CONFIGS[variant]
  
  // Merge configurations with variant taking precedence
  const config: AvatarConfig = {
    ...sizeConfig,
    ...variantConfig,
    // Ensure eyes and mouth fall back to size config if not set in variant
    eyes: variantConfig.eyes || sizeConfig.eyes || 'round,happy',
    mouth: variantConfig.mouth || sizeConfig.mouth || 'smile01',
    // Ensure colors is always set
    colors: variantConfig.colors || sizeConfig.colors || 'B6E5A8,C3C3C3,EBC0C0'
  }
  
  const paramObj: Record<string, string> = {
    seed: userId,
    size: pixelSize.toString(),
    colorful: 'true',
    primaryColorLevel: '600',
    secondaryColorLevel: '400',
    colors: config.colors,
    backgroundColor: config.backgroundColor || 'transparent',
    eyes: config.eyes,
    mouth: config.mouth,
    textureChance: (config.textureChance || 15).toString(),
    backgroundType: 'gradientLinear',
    backgroundRotation: '45'
  }
  
  if (config.antennas) {
    paramObj.antennas = config.antennas;
  }
  
  const params = new URLSearchParams(paramObj)
  
  return `https://api.dicebear.com/7.x/bottts/svg?${params.toString()}`
}

/**
 * Generates avatar alt text for accessibility
 * 
 * @param username - User's display name
 * @param variant - Avatar variant
 * @returns Descriptive alt text
 */
export function generateAvatarAltText(username: string, variant: AvatarVariant): string {
  const variantDescriptions = {
    default: 'robot avatar',
    winning: 'celebrating robot avatar with golden accents',
    vip: 'premium robot avatar with VIP styling',
    competitive: 'competitive robot avatar with enhanced features'
  }
  
  return `${username} - ${variantDescriptions[variant]}`
}

/**
 * Preloads avatar images for better UX
 * 
 * @param userIds - Array of user IDs to preload avatars for
 * @param size - Avatar size to preload
 * @param variant - Avatar variant to preload
 */
export function preloadAvatars(
  userIds: string[], 
  size: AvatarSize = 'md', 
  variant: AvatarVariant = 'default'
): void {
  userIds.forEach(userId => {
    const img = new Image()
    img.src = generateBotttsAvatar(userId, size, variant)
  })
}

/**
 * Validates avatar configuration parameters
 */
export function isValidAvatarSize(size: string): size is AvatarSize {
  return ['xs', 'sm', 'md', 'lg', 'xl'].includes(size)
}

export function isValidAvatarVariant(variant: string): variant is AvatarVariant {
  return ['default', 'winning', 'vip', 'competitive'].includes(variant)
}

