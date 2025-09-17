# Avatar Component - LottoDrop Gaming Platform

Enhanced DiceBear Bottts avatar component with casino theming and gaming-specific variants.

## Features

- **Robot Avatars**: Uses DiceBear Bottts style for consistent, friendly robot avatars
- **Casino Theming**: Purple/violet color scheme matching LottoDrop brand
- **Gaming Variants**: Special styling for winning, VIP, and competitive states
- **Size Responsive**: Optimized configurations for different sizes (xs, sm, md, lg, xl)
- **Accessibility**: WCAG compliant with descriptive alt text
- **Performance**: Lazy loading and error handling built-in

## Usage

### Basic Usage
```tsx
import { Avatar } from '@/components/atoms/Avatar/Avatar'

// Simple avatar with userId
<Avatar userId="user123" alt="John Doe" size="md" />

// With status indicator
<Avatar 
  userId="user123" 
  alt="John Doe" 
  size="md" 
  status="online" 
/>
```

### Gaming Variants

```tsx
// Default robot avatar
<Avatar userId="user123" alt="Player" variant="default" />

// Winning celebration avatar (golden accents)
<Avatar userId="user123" alt="Winner" variant="winning" />

// VIP premium avatar (gold/purple theme)
<Avatar userId="user123" alt="VIP Player" variant="vip" />

// Competitive tournament avatar (enhanced features)
<Avatar userId="user123" alt="Pro Player" variant="competitive" />
```

### Size Examples

```tsx
// Extra small (24px) - minimal details
<Avatar userId="user123" size="xs" />

// Small (32px) - simple features
<Avatar userId="user123" size="sm" />

// Medium (40px) - standard details (default)
<Avatar userId="user123" size="md" />

// Large (48px) - detailed features
<Avatar userId="user123" size="lg" />

// Extra large (64px) - full detail
<Avatar userId="user123" size="xl" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | - | Unique identifier for avatar generation |
| `alt` | `string` | `'Avatar'` | Alt text for accessibility |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Avatar size |
| `variant` | `'default' \| 'winning' \| 'vip' \| 'competitive'` | `'default'` | Gaming variant |
| `status` | `'online' \| 'offline' \| 'busy' \| 'away'` | - | Status indicator |
| `src` | `string` | - | Custom image URL (overrides generated avatar) |
| `fallback` | `string` | - | Fallback text if image fails |

## Variant Details

### Default
- **Colors**: Purple gradient (#6A4C93, #9D4EDD, #A855F7)
- **Features**: Standard robot features matching size
- **Use**: Regular users, general interface

### Winning
- **Colors**: Purple with gold accents (#9D4EDD, #FFD700, #A855F7)
- **Features**: Glowing eyes, big smile, lightbulb antenna
- **Use**: Recent winners, celebration states

### VIP
- **Colors**: Gold and purple premium theme (#FFD700, #FFA500, #9D4EDD)
- **Features**: Enhanced textures, framed eyes, premium styling
- **Use**: VIP users, high rollers, premium accounts

### Competitive
- **Colors**: Tech-focused with cyan accents (#6A4C93, #FF6B6B, #4ECDC4)
- **Features**: Robocop-style eyes, tech mouth, WiFi antenna
- **Use**: Tournament players, competitive modes, esports

## Technical Details

- **API**: DiceBear API v7.x with Bottts style
- **Performance**: Lazy loading, error handling, preload support
- **Accessibility**: WCAG 2.1 AA compliant alt text
- **Caching**: Browser caches generated SVGs automatically
- **Fallback**: Text-based fallback for failed images

## Utility Functions

The component uses utility functions from `@/utils/avatarUtils`:

- `generateBotttsAvatar()` - Generate optimized Bottts URLs
- `generateAvatarAltText()` - Create accessible alt text
- `preloadAvatars()` - Preload avatar images for performance

## Migration from Identicon

The component maintains backward compatibility. Existing usage will automatically use Bottts instead of identicon with improved theming and features.

### Before (Identicon)
```tsx
<Avatar userId="user123" alt="Player" size="md" />
// Generated geometric patterns
```

### After (Bottts)
```tsx
<Avatar userId="user123" alt="Player" size="md" />
// Generates friendly robot avatars with LottoDrop theming
```

## Brand Compliance

All avatar variants comply with LottoDrop's brand guidelines:
- Primary colors: #9D4EDD (main purple), #6A4C93 (dark purple)
- Accent colors: #A855F7, #C084FC
- Responsible gaming: No imagery appealing to minors
- Consistent across all platform touchpoints