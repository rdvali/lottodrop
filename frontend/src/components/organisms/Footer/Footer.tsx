const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-secondary-bg border-t border-primary/10 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-gradient rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">L</span>
            </div>
            <span className="text-lg font-bold gradient-text">LottoDrop</span>
          </div>

          {/* Copyright */}
          <p className="text-sm text-gray-500">
            © {currentYear} LottoDrop. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer