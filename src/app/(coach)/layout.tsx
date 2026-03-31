import { Header } from '@/components/Header'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pt-14">{children}</main>
    </>
  )
}
