import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import WhatWeDo from '../components/WhatWeDo'
import HowItWorks from '../components/HowItWorks'
import DigestPreview from '../components/DigestPreview'
import PortalCTA from '../components/PortalCTA'
import Footer from '../components/Footer'
import { useScrollToHash } from '../hooks/useScrollToHash'

export default function Landing() {
  useScrollToHash()

  return (
    <div className="app-surface relative min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <WhatWeDo />
        <HowItWorks />
        <PortalCTA />
        <DigestPreview />
      </main>
      <Footer />
    </div>
  )
}

