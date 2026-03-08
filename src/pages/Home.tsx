import { Header } from '@/components/header'
import { Hero } from '@/components/hero'
import { Tournament } from '@/components/tournament'
import { Footer } from '@/components/footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Tournament />
      <Footer />
    </main>
  )
}
