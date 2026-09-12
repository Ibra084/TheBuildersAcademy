import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import WhatWeDo from '../components/WhatWeDo'
import HowItWorks from '../components/HowItWorks'
import PortalCTA from '../components/PortalCTA'
import Footer from '../components/Footer'

export default function Landing() {
  return (
    <div className="app-surface relative min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <WhatWeDo />
        <HowItWorks />
        <PortalCTA />
      </main>
      <Footer />
    </div>
  )
}

