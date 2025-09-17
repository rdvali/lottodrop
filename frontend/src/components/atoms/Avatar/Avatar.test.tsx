import { render } from '@testing-library/react'
import Avatar from './Avatar'

describe('Avatar Component - Bottts Style', () => {
  it('should render Bottts avatar with userId', () => {
    const { container } = render(
      <Avatar userId="test-user-123" alt="Test User" size="md" />
    )
    
    const img = container.querySelector('img')
    expect(img).toBeTruthy()
    expect(img?.src).toContain('api.dicebear.com/7.x/bottts')
    expect(img?.src).toContain('seed=test-user-123')
  })
  
  it('should apply correct size classes', () => {
    const { container } = render(
      <Avatar userId="user1" size="xl" />
    )
    
    const avatarDiv = container.querySelector('.w-16.h-16')
    expect(avatarDiv).toBeTruthy()
  })
  
  it('should render with gaming variant', () => {
    const { container } = render(
      <Avatar userId="winner" variant="winning" />
    )
    
    const img = container.querySelector('img')
    expect(img?.src).toContain('bottts')
    // Winning variant should have gold colors
    expect(img?.src).toMatch(/FFD700|FFA500|FF6B6B/)
  })
  
  it('should show status indicator', () => {
    const { container } = render(
      <Avatar userId="user1" status="online" />
    )
    
    const statusIndicator = container.querySelector('.bg-success')
    expect(statusIndicator).toBeTruthy()
  })
  
  it('should fallback to initials when no userId or src', () => {
    const { getByText } = render(
      <Avatar alt="John Doe" />
    )
    
    expect(getByText('J')).toBeTruthy()
  })
})

// Visual test examples for documentation
export const AvatarExamples = () => (
  <div style={{ display: 'flex', gap: '20px', padding: '20px', flexWrap: 'wrap' }}>
    <div>
      <h3>Sizes</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Avatar userId="user1" size="xs" />
        <Avatar userId="user1" size="sm" />
        <Avatar userId="user1" size="md" />
        <Avatar userId="user1" size="lg" />
        <Avatar userId="user1" size="xl" />
      </div>
    </div>
    
    <div>
      <h3>Gaming Variants</h3>
      <div style={{ display: 'flex', gap: '10px' }}>
        <Avatar userId="user2" variant="default" />
        <Avatar userId="user2" variant="winning" />
        <Avatar userId="user2" variant="vip" />
        <Avatar userId="user2" variant="competitive" />
      </div>
    </div>
    
    <div>
      <h3>Status Indicators</h3>
      <div style={{ display: 'flex', gap: '10px' }}>
        <Avatar userId="user3" status="online" />
        <Avatar userId="user3" status="offline" />
        <Avatar userId="user3" status="busy" />
        <Avatar userId="user3" status="away" />
      </div>
    </div>
    
    <div>
      <h3>Different Seeds (Unique Bots)</h3>
      <div style={{ display: 'flex', gap: '10px' }}>
        {['alice', 'bob', 'charlie', 'diana', 'eve'].map(seed => (
          <Avatar key={seed} userId={seed} size="md" />
        ))}
      </div>
    </div>
  </div>
)

