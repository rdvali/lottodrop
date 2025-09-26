import { Logo } from '@components/atoms'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-secondary-bg border-t border-primary/10 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Brand */}
          <Logo size="sm" showText={true} />

          {/* Copyright */}
          <p className="text-sm text-gray-700">
            © {currentYear} Drop. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer